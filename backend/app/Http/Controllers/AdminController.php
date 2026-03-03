<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\SmtpSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * Method setupMailer dihapus atau dibiarkan saja jika masih digunakan
     * oleh fitur lain seperti forgot password di controller ini (jika ada).
     */
    private function setupMailer($userId)
    {
        try {
            $smtp = SmtpSetting::where('user_id', $userId)->first(); 

            if (!$smtp || empty($smtp->auth_user) || empty($smtp->auth_pass) || empty($smtp->host)) {
                return false;
            }

            config(['mail.default' => 'smtp']); 

            $encryption = $smtp->port == 465 ? 'ssl' : 'tls';
            
            config([
                'mail.mailers.smtp' => [
                    'transport' => 'smtp',
                    'host'       => $smtp->host,
                    'port'       => $smtp->port,
                    'encryption' => $encryption,
                    'username'   => $smtp->auth_user,
                    'password'   => $smtp->auth_pass,
                    'timeout'    => null,
                    'auth_mode'  => null,
                    'stream'     => [
                        'ssl' => [
                            'allow_self_signed' => true,
                            'verify_peer'       => false,
                            'verify_peer_name'  => false,
                        ],
                    ],
                ],
                'mail.from.address' => $smtp->auth_user,
                'mail.from.name' => $smtp->from_name ?? 'Admin Sistem'
            ]);

            app()->forgetInstance('mailer');
            
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
        $admins = Admin::orderBy('created_at', 'desc')->get();
        return response()->json($admins);
    }

    /**
     * POST /api/admin/register
     * Simpan admin baru tanpa kirim email
     */
    public function store(Request $request)
    {
        if ($request->user()->role !== 'superadmin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'username' => 'required|unique:admins,username',
            'email' => 'required|email|unique:admins,email',
            'password' => 'required|min:6',
        ]);

        try {
            // Langsung buat data admin di database
            $admin = Admin::create([
                'username' => $request->username,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => $request->role ?? 'admin', // Mengambil role dari input frontend
                'is_active' => true
            ]);

            return response()->json([
                'message' => 'Admin berhasil ditambahkan.', 
                'data' => $admin
            ], 201);

        } catch (\Throwable $e) {
            Log::error("Add Admin Error: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal menambahkan admin: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        if ($request->user()->role !== 'superadmin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $target = Admin::find($id);
        if (!$target) return response()->json(['message' => 'Admin not found'], 404);
        
        $actor = $request->user();

        if ($target->id === $actor->id) {
            return response()->json(['message' => 'Tidak bisa menghapus akun sendiri'], 400);
        }

        if ($target->id === 1) {
            return response()->json(['message' => 'Super Admin Utama tidak dapat dihapus.'], 403);
        }

        if ($target->role === 'superadmin') {
            if ($actor->id !== 1) {
                return response()->json(['message' => 'Hanya Super Admin Utama yang dapat menghapus Super Admin lain.'], 403);
            }
        }

        $target->delete();
        return response()->json(['message' => 'Admin berhasil dihapus']);
    }

    public function ping()
    {
        return response()->json(['message' => 'pong', 'time' => now()]);
    }

    public function updateRole(Request $request, $id)
    {
        if ($request->user()->role !== 'superadmin') return response()->json(['message' => 'Unauthorized'], 403);

        $target = Admin::find($id);
        if (!$target) return response()->json(['message' => 'Admin not found'], 404);
        
        $actor = $request->user();

        if ($target->id === 1) {
            return response()->json(['message' => 'Role Super Admin Utama tidak dapat diubah.'], 403);
        }

        if ($target->role === 'superadmin') {
            if ($actor->id !== 1) {
                return response()->json(['message' => 'Hanya Super Admin Utama yang dapat mengubah role Super Admin lain.'], 403);
            }
        }

        $target->role = $request->role;
        $target->save();

        return response()->json(['message' => 'Role updated']);
    }

    public function updateUsername(Request $request, $id)
    {
        if ($request->user()->role !== 'superadmin' && $request->user()->id != $id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate(['username' => 'required|unique:admins,username,' . $id]);

        $admin = Admin::find($id);
        if (!$admin) return response()->json(['message' => 'Admin not found'], 404);

        $admin->username = $request->username;
        $admin->save();

        return response()->json(['message' => 'Username updated', 'username' => $admin->username]);
    }

    public function toggleStatus(Request $request, $id)
    {
        $target = Admin::find($id);
        if (!$target) return response()->json(['message' => 'Admin tidak ditemukan'], 404);

        $actor = $request->user();

        if ($target->id === 1) {
            return response()->json(['message' => 'Super Admin Utama tidak dapat dinonaktifkan.'], 403);
        }

        if ($target->role === 'superadmin') {
            if ($actor->id !== 1) {
                return response()->json(['message' => 'Hanya Super Admin Utama yang dapat menonaktifkan Super Admin lain.'], 403);
            }
        }

        $target->is_active = !$target->is_active;
        $target->save();

        return response()->json([
            'message' => 'Status admin berhasil diperbarui.',
            'newStatus' => $target->is_active ? 1 : 0
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'currentPassword' => 'required',
            'newPassword' => 'required|min:6',
        ]);

        $admin = $request->user();

        if (!Hash::check($request->currentPassword, $admin->password)) {
            return response()->json(['message' => 'Password lama salah.'], 401);
        }

        if (Hash::check($request->newPassword, $admin->password)) {
            return response()->json(['message' => 'Password baru tidak boleh sama dengan password lama.'], 400);
        }

        $admin->password = Hash::make($request->newPassword);
        $admin->save();

        return response()->json(['message' => 'Password berhasil diubah.']);
    }

    // ==============================================================
    // TAMBAHAN BARU: FUNGSI UNTUK MENGAMBIL STATISTIK DASHBOARD
    // ==============================================================
    public function dashboardStats(Request $request)
    {
        $user = $request->user();
        $adminId = $user->id;

        // 1. Total Ujian
        $totalUjian = DB::table('exams')
            ->where('admin_id', $adminId)
            ->where('is_deleted', false)
            ->count();

        // 2. Total Undangan
        $totalUndangan = DB::table('invitations')
            ->where('admin_id', $adminId)
            ->count();

        // 3. Total Peserta (Hanya hitung peserta yang mengerjakan ujian milik admin ini)
        $totalPeserta = DB::table('hasil_ujian')
            ->join('exams', 'exams.id', '=', 'hasil_ujian.exam_id')
            ->where('exams.admin_id', $adminId)
            ->distinct('hasil_ujian.peserta_id')
            ->count('hasil_ujian.peserta_id');

        // 4. Ambil 5 Ujian Terbaru
        $recentUjian = DB::table('exams')
            ->select('id', 'keterangan', 'tanggal')
            ->where('admin_id', $adminId)
            ->where('is_deleted', false)
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        // 5. Ambil 5 Hasil Terbaru & Hitung Skor PG nya langsung
        $recentPesertaIds = DB::table('hasil_ujian')
            ->join('exams', 'exams.id', '=', 'hasil_ujian.exam_id')
            ->where('exams.admin_id', $adminId)
            ->select('hasil_ujian.peserta_id', DB::raw('MAX(hasil_ujian.created_at) as submitted_at'))
            ->groupBy('hasil_ujian.peserta_id')
            ->orderBy('submitted_at', 'desc')
            ->take(5)
            ->pluck('peserta_id');

        $recentHasil = [];
        if ($recentPesertaIds->isNotEmpty()) {
            $rawHasil = DB::table('hasil_ujian as h')
                ->join('peserta as p', 'p.id', '=', 'h.peserta_id')
                ->join('questions as q', 'q.id', '=', 'h.question_id')
                ->whereIn('h.peserta_id', $recentPesertaIds)
                ->select('p.id as peserta_id', 'p.nama', 'h.benar', 'q.tipe_soal')
                ->get();

            $grouped = [];
            foreach ($rawHasil as $row) {
                $pid = $row->peserta_id;
                if (!isset($grouped[$pid])) {
                    $grouped[$pid] = ['peserta_id' => $pid, 'nama' => $row->nama, 'pg_benar' => 0, 'total_pg' => 0];
                }
                if (in_array($row->tipe_soal, ['pilihanGanda', 'pilihan_ganda'])) {
                    $grouped[$pid]['total_pg']++;
                    if ($row->benar) $grouped[$pid]['pg_benar']++;
                }
            }

            foreach ($recentPesertaIds as $pid) {
                if(isset($grouped[$pid])) {
                    $g = $grouped[$pid];
                    $skor = $g['total_pg'] > 0 ? round(($g['pg_benar'] / $g['total_pg']) * 100) : 0;
                    $recentHasil[] = [
                        'peserta_id' => $g['peserta_id'],
                        'nama' => $g['nama'],
                        'skor_pg' => $skor
                    ];
                }
            }
        }

        return response()->json([
            'totalUjian' => $totalUjian,
            'totalPeserta' => $totalPeserta,
            'totalUndangan' => $totalUndangan,
            'recentUjian' => $recentUjian,
            'recentHasil' => $recentHasil
        ]);
    }
}