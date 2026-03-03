import React from "react";
import { FaInfoCircle, FaTimes, FaClock } from "react-icons/fa";

const StatusUjian = ({ isOpen, message, onClose }) => {
  if (!isOpen) {
    return null;
  }

  // Deteksi apakah pesannya tentang sesi ditutup
  const isSesiDitutup = message && message.includes("Sesi ujian saat ini ditutup");
  let jamDibuka = "";
  
  if (isSesiDitutup) {
    // 1. Ekstrak teks waktu dari pesan backend (Contoh: "15:01:00 - 15:48:00 WIB")
    const rawTime = message.split("Akses dibuka pukul: ")[1];
    
    // 2. Hilangkan detik (:00) menggunakan regex agar menjadi "15:01 - 15:48 WIB"
    if (rawTime) {
      jamDibuka = rawTime.replace(/(\d{2}:\d{2}):\d{2}/g, '$1');
    }
  }

  return (
    // Backdrop/Overlay gelap
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      
      {/* Konten Modal */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform scale-100 animate-fade-in-up">
        
        {/* Bagian Header Info */}
        <div className="bg-blue-50 p-6 flex flex-col items-center justify-center border-b border-blue-100">
          <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3 ring-4 ring-blue-50">
            <FaInfoCircle className="text-3xl" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 text-center">
            Informasi
          </h3>
        </div>

        {/* Bagian Body */}
        <div className="p-6">
          {isSesiDitutup ? (
            <>
              <p className="text-gray-600 text-sm text-center mb-6 leading-relaxed">
                Mohon maaf, sesi ujian ini saat ini ditutup atau belum saatnya dikerjakan.
              </p>
              
              {/* Kotak Detail Waktu - Sama persis seperti Screenshot Baru */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
                <FaClock className="text-gray-400 text-xl shrink-0" />
                <div>
                  <span className="text-[11px] text-gray-500 block uppercase font-bold tracking-wider mb-0.5">
                    Akses Dibuka Pukul
                  </span>
                  <span className="text-base font-semibold text-blue-600 block">
                    {jamDibuka}
                  </span>
                </div>
              </div>
            </>
          ) : (
            // Fallback untuk pesan biasa (seperti salah sandi, dll)
            <p className="text-gray-600 text-sm text-center leading-relaxed">
              {message}
            </p>
          )}
        </div>

        {/* Bagian Footer Tombol */}
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full inline-flex justify-center items-center gap-2 rounded-xl border border-transparent shadow-sm px-4 py-3 bg-[#111827] text-sm font-bold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all"
          >
            <FaTimes /> Tutup Pemberitahuan
          </button>
        </div>

      </div>
    </div>
  );
};

export default StatusUjian;