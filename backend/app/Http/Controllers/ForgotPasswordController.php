<?php

namespace App\Http\Controllers;

use App\Models\PasswordResetRequest;
use App\Models\Admin;
use App\Models\SmtpSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ForgotPasswordController extends Controller
{
    private function setupMailer($userId)
    {
        try {
            $smtp = SmtpSetting::where('user_id', $userId)->first(); 

            if (!$smtp || empty($smtp->auth_user) || empty($smtp->auth_pass) || empty($smtp->host)) {
                return false;
            }

            // [PERBAIKAN 1] Paksa Laravel menggunakan driver 'smtp' saat ini juga
            // Tanpa ini, Laravel mungkin masih menggunakan driver 'log' atau default .env
            Config::set('mail.default', 'smtp'); 
            
            // [PERBAIKAN 2] Konfigurasi Array Lengkap dengan Bypass SSL
            // Ini agar PHP tidak menolak koneksi ke Google karena masalah sertifikat lokal
            $encryption = $smtp->port == 465 ? 'ssl' : 'tls';
            
            Config::set('mail.mailers.smtp', [
                'transport' => 'smtp',
                'host'       => $smtp->host,
                'port'       => $smtp->port,
                'encryption' => $encryption,
                'username'   => $smtp->auth_user,
                'password'   => $smtp->auth_pass,
                'timeout'    => null,
                'auth_mode'  => null,
                // Opsi 'stream' ini SANGAT PENTING untuk mengatasi email tidak masuk/gagal koneksi
                'stream'     => [
                    'ssl' => [
                        'allow_self_signed' => true,
                        'verify_peer'       => false,
                        'verify_peer_name'  => false,
                    ],
                ],
            ]);
            
            // Set Pengirim Global
            Config::set('mail.from.address', $smtp->auth_user);
            Config::set('mail.from.name', $smtp->from_name ?? 'Admin Sistem');

            // Reset Instance agar config baru terbaca
            app()->forgetInstance('mailer');
            Mail::clearResolvedInstances();
            
            return true;
        } catch (\Throwable $e) {
            Log::error("Setup Mailer Error: " . $e->getMessage());
            return false;
        }
    }

    public function index(Request $request)
    {
        if ($request->user()->role !== 'superadmin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        $requests = PasswordResetRequest::orderBy('created_at', 'desc')->get();
        return response()->json($requests);
    }

    public function approve(Request $request)
    {
        if ($request->user()->role !== 'superadmin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
    
        $request->validate([
            'id' => 'required',
            'newPassword' => 'required|min:6'
        ]);
    
        // Aktifkan setupMailer agar email benar-benar terkirim
        if (!$this->setupMailer($request->user()->id)) {
            return response()->json([
                'message' => 'Gagal! Konfigurasi Email belum disetting. Silakan ke menu Pengaturan Email.'
            ], 400);
        }
    
        DB::beginTransaction();
    
        try {
            $resetRequest = PasswordResetRequest::find($request->id);
            if (!$resetRequest) {
                return response()->json(['message' => 'Permintaan tidak ditemukan'], 404);
            }
    
            $targetAdmin = Admin::where('email', $resetRequest->email)->first();
            if (!$targetAdmin) {
                return response()->json(['message' => 'Admin tidak ditemukan.'], 404);
            }
    
            // Update password
            $targetAdmin->password = Hash::make($request->newPassword);
            $targetAdmin->save();
    
            // Update status request
            $resetRequest->status = 'approved';
            $resetRequest->save();
    
            // Commit dulu agar password tersimpan
            DB::commit();
    
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal memproses reset password: ' . $e->getMessage()
            ], 500);
        }
    
        // Setelah commit, baru kirim email
        try {
            $details = [
                'username' => $targetAdmin->username,
                'newPassword' => $request->newPassword,
                'from_name' => Config::get('mail.from.name')
            ];
    
            Mail::send([], [], function ($message) use ($targetAdmin, $details) {
                $message->to($targetAdmin->email)
                        ->subject("Reset Password Berhasil")
                        ->html("
                            <div style='font-family: Arial, sans-serif; color: #333;'>
                                <h2>Reset Password Berhasil</h2>
                                <p>Halo <b>{$details['username']}</b>,</p>
                                <p>Password Anda telah direset oleh Superadmin.</p>
                                <hr />
                                <p><b>Password Baru:</b> {$details['newPassword']}</p>
                                <p>Silakan login dan segera ganti password ini demi keamanan.</p>
                                <br />
                                <p>Salam,<br/>{$details['from_name']}</p>
                            </div>
                        ");
            });
    
            return response()->json([
                'message' => 'Sukses! Password telah direset dan email notifikasi terkirim. Password telah disalin ke clipboard.'
            ]);
    
        } catch (\Throwable $e) {
    
            $errMsg = $e->getMessage();
            if (str_contains($errMsg, 'Connection could not be established')) {
                $errMsg = 'Koneksi SMTP gagal. Cek internet atau App Password Gmail Anda.';
            }
    
            // Password tetap berhasil direset
            return response()->json([
                'message' => 'Password berhasil direset dan telah disalin ke clipboard, tetapi email gagal dikirim. Error: ' . $errMsg
            ], 200);
        }
    }

    public function reject(Request $request)
    {
        if ($request->user()->role !== 'superadmin') return response()->json(['message' => 'Unauthorized'], 403);
        try {
            $req = PasswordResetRequest::find($request->id);
            if ($req) { 
                $req->status = 'rejected'; 
                $req->save(); 
                return response()->json(['message' => 'Permintaan ditolak.']); 
            }
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function requestReset(Request $request)
    {
        $request->validate([
            'identifier' => 'required',
            'whatsapp' => 'required',
            'reason' => 'nullable'
        ]);

        try {
            $admin = Admin::where('email', $request->identifier)
                        ->orWhere('username', $request->identifier)
                        ->first();

            if (!$admin) {
                return response()->json(['message' => 'Username atau Email tidak terdaftar.'], 404);
            }

            PasswordResetRequest::create([
                'email' => $admin->email,
                'username' => $admin->username,
                'whatsapp' => $request->whatsapp,
                'reason' => $request->reason,
                'status' => 'pending'
            ]);

            return response()->json(['message' => 'Permintaan reset password berhasil dikirim.']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }
}