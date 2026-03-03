<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Jika response bukan instance dari Symfony\Component\HttpFoundation\Response (misal stream), lewati
        if (!method_exists($response, 'headers')) {
            return $response;
        }

        // Atur Content Security Policy (CSP)
        // Catatan: 'unsafe-inline' mungkin masih dibutuhkan oleh Tailwind/React, tapi kita kunci sumber domainnya
        $csp = "default-src 'self'; " .
               "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; " .
               "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " .
               "font-src 'self' https://fonts.gstatic.com data:; " .
               "img-src 'self' data: blob:; " .
               "form-action 'self'; " . 
               "frame-ancestors 'none'; " .
               "connect-src 'self' http://localhost:8000; " .
               "upgrade-insecure-requests;";

        $response->headers->set('Content-Security-Policy', $csp);

        // BONUS: Memperbaiki kerentanan "Low" (Server Leaks Information via X-Powered-By)
        $response->headers->remove('X-Powered-By');

        return $response;
    }
}