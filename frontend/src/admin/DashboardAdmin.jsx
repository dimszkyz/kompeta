import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FaTachometerAlt,
  FaListUl,
  FaUsers,
  FaPaperPlane,
  FaPlus,
  FaArrowRight,
  FaSyncAlt,
  FaFileAlt,
} from "react-icons/fa";

const API_URL = "https://kompeta.web.bps.go.id";
const CACHE_KEY = "dashboard_data_cache"; // Kunci untuk penyimpanan cache sementara

// ------------------------------------------------------------------
// HELPER DARI DaftarSoal.jsx
// ------------------------------------------------------------------
const pad2 = (n) => String(n).padStart(2, "0");
const toLocalDateOnly = (val) => {
  const d = new Date(val);
  if (!isNaN(d)) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  const s = String(val || "");
  return s.includes("T") ? s.slice(0, 10) : s;
};
const formatTanggal = (tgl) => {
  if (!tgl) return "-";
  const [y, m, d] = toLocalDateOnly(tgl).split("-");
  if (!y || !m || !d) return tgl;
  return `${d}-${m}-${y}`;
};

// ------------------------------------------------------------------
// KOMPONEN KARTU STATISTIK (Ditambah prop loading untuk Skeleton)
// ------------------------------------------------------------------
const StatCard = ({ icon, label, value, to, color, loading }) => (
  <Link
    to={to}
    className={`bg-white p-4 md:p-5 rounded-xl shadow-md border-l-4 ${color} transition-all hover:shadow-lg hover:scale-[1.02] block`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
        <div className="p-2 md:p-3 rounded-full bg-gray-100 flex-shrink-0">
          <div className="text-xl md:text-2xl">{icon}</div>
        </div>
        <div className="min-w-0">
          <p className="text-xs md:text-sm font-medium text-gray-500 truncate">
            {label}
          </p>
          {loading ? (
            <div className="h-7 md:h-9 bg-gray-200 rounded animate-pulse w-16 mt-1"></div>
          ) : (
            <p className="text-2xl md:text-3xl font-bold text-gray-900 truncate">
              {value}
            </p>
          )}
        </div>
      </div>
      <FaArrowRight className="text-gray-400 text-sm md:text-base flex-shrink-0" />
    </div>
  </Link>
);

// ------------------------------------------------------------------
// KOMPONEN UTAMA DASHBOARD
// ------------------------------------------------------------------
const DashboardAdmin = () => {
  // 1. Inisialisasi state dari Cache (jika ada)
  const getCachedData = () => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  };

  const cachedData = getCachedData();

  const [stats, setStats] = useState({
    totalUjian: cachedData?.totalUjian ?? 0,
    totalPeserta: cachedData?.totalPeserta ?? 0,
    totalUndangan: cachedData?.totalUndangan ?? 0,
  });
  const [recentUjian, setRecentUjian] = useState(cachedData?.recentUjian ?? []);
  const [recentHasil, setRecentHasil] = useState(cachedData?.recentHasil ?? []);
  
  // loading = true HANYA jika tidak ada cache (pertama kali load halaman)
  const [loading, setLoading] = useState(!cachedData);
  // isFetching = true untuk indikator sinkronisasi di background
  const [isFetching, setIsFetching] = useState(false);

  // ============================
  // FETCH DATA TUNGGAL
  // ============================
  const fetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      const token = sessionStorage.getItem("adminToken");
      if (!token) return;

      const res = await fetch(`${API_URL}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setStats({
          totalUjian: data.totalUjian,
          totalPeserta: data.totalPeserta,
          totalUndangan: data.totalUndangan,
        });
        setRecentUjian(data.recentUjian || []);
        setRecentHasil(data.recentHasil || []);

        // Simpan data terbaru ke cache
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
    } catch (err) {
      console.error("Gagal memuat data dashboard:", err);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Hapus global loading spinner agar layout langsung tampil
  // if (loading) return <Spinner/> dihapus.

  return (
    <>
      <div className="bg-gray-50 min-h-screen flex flex-col font-sans">
        {/* 1. HEADER */}
        <div className="bg-white shadow-sm border-b border-gray-300 py-4 pl-14 pr-4 md:px-8 md:py-5 sticky top-0 z-50 transition-all flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <span className="dashboard-header-icon inline-flex">
              <FaTachometerAlt className="text-blue-600 w-5 h-5 md:w-6 md:h-6" />
            </span>
            Dashboard Admin
            {isFetching && (
              <FaSyncAlt 
                className="text-gray-400 text-sm md:text-base animate-spin ml-2" 
                title="Menyinkronkan data..." 
              />
            )}
          </h2>
        </div>

        {/* 2. KONTEN */}
        <div className="p-4 md:p-8 lg:p-10 flex-1 dashboard-content">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
            {/* 2.1 RINGKASAN STATISTIK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 dashboard-stat-grid">
              <StatCard
                to="/admin/daftar-soal"
                label="Daftar Ujian"
                value={stats.totalUjian}
                color="border-blue-500"
                icon={<FaListUl className="text-blue-500" />}
                loading={loading}
              />
              <StatCard
                to="/admin/hasil-ujian"
                label="Total Peserta"
                value={stats.totalPeserta}
                color="border-green-500"
                icon={<FaUsers className="text-green-500" />}
                loading={loading}
              />
              <StatCard
                to="/admin/tambah-peserta"
                label="Undangan Terkirim"
                value={stats.totalUndangan}
                color="border-yellow-500"
                icon={<FaPaperPlane className="text-yellow-500" />}
                loading={loading}
              />
            </div>

            {/* 2.2 AKSI CEPAT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <Link
                to="/admin/tambah-soal"
                className="bg-white p-4 md:p-6 rounded-xl shadow-md border border-gray-200 flex justify-between items-center transition-all hover:bg-gray-50 hover:shadow-lg group"
              >
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                    Tambah Ujian
                  </h3>
                  <p className="text-gray-500 text-xs md:text-sm mt-1">
                    Buat soal pilihan ganda atau esai baru.
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full flex-shrink-0">
                  <FaPlus className="text-blue-600 text-lg md:text-xl" />
                </div>
              </Link>
              <Link
                to="/admin/tambah-peserta"
                className="bg-white p-4 md:p-6 rounded-xl shadow-md border border-gray-200 flex justify-between items-center transition-all hover:bg-gray-50 hover:shadow-lg group"
              >
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-800 group-hover:text-green-600 transition-colors">
                    Undang Peserta
                  </h3>
                  <p className="text-gray-500 text-xs md:text-sm mt-1">
                    Kirim undangan ujian via email.
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full flex-shrink-0">
                  <FaPaperPlane className="text-green-600 text-lg md:text-xl" />
                </div>
              </Link>
            </div>

            {/* 2.3 AKTIVITAS TERBARU */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Ujian Terbaru */}
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                  <h3 className="text-base md:text-lg font-semibold text-gray-800">
                    Ujian Terbaru
                  </h3>
                  <Link
                    to="/admin/daftar-soal"
                    className="text-xs md:text-sm font-medium text-blue-600 hover:underline"
                  >
                    Lihat Semua
                  </Link>
                </div>
                <div className="space-y-3 dashboard-card-list">
                  {loading ? (
                    // Efek Skeleton saat load pertama kali
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4 mb-1"></div>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                        </div>
                        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
                      </div>
                    ))
                  ) : recentUjian.length > 0 ? (
                    recentUjian.map((ujian) => (
                      <div
                        key={ujian.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 gap-3 dashboard-card-list-item"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-700 text-sm md:text-base truncate">
                            {ujian.keterangan}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {formatTanggal(ujian.tanggal)}
                          </p>
                        </div>
                        <Link
                          to={`/admin/edit-soal/${ujian.id}`}
                          className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-full transition-colors flex-shrink-0 icon-link"
                          title="Edit Soal"
                        >
                          <FaArrowRight size={14} />
                        </Link>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Belum ada ujian yang dibuat.
                    </p>
                  )}
                </div>
              </div>

              {/* Hasil Terbaru */}
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                  <h3 className="text-base md:text-lg font-semibold text-gray-800">
                    Hasil Terbaru
                  </h3>
                  <Link
                    to="/admin/hasil-ujian"
                    className="text-xs md:text-sm font-medium text-blue-600 hover:underline"
                  >
                    Lihat Semua
                  </Link>
                </div>
                <div className="space-y-3 dashboard-card-list">
                  {loading ? (
                     // Efek Skeleton saat load pertama kali
                     [...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4 mb-1"></div>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
                        </div>
                        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
                      </div>
                    ))
                  ) : recentHasil.length > 0 ? (
                    recentHasil.map((hasil) => (
                      <div
                        key={hasil.peserta_id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 gap-3 dashboard-card-list-item"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-700 text-sm md:text-base truncate">
                            {hasil.nama}
                          </p>
                          <p className="text-xs text-gray-500">
                            Skor PG:{" "}
                            <span className="font-bold text-blue-700">
                              {hasil.skor_pg}%
                            </span>
                          </p>
                        </div>
                        <Link
                          to={`/admin/hasil/${hasil.peserta_id}`}
                          className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-full transition-colors flex-shrink-0 icon-link"
                          title="Lihat Detail"
                        >
                          <FaFileAlt size={14} />
                        </Link>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Belum ada peserta yang mengerjakan.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE & TABLET-ONLY OVERRIDES */}
      <style>{`
        /* Tablet (640px - 1024px): atur ulang kolom statistik agar lebih nyaman */
        @media (max-width: 1024px) and (min-width: 640px) {
          .dashboard-stat-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        /* Smartphone (<= 639px): optimasi list & header */
        @media (max-width: 639px) {
          .dashboard-content {
            padding-bottom: 1.25rem;
          }

          .dashboard-card-list {
            max-height: 340px;
            overflow-y: auto;
            padding-right: 0.25rem;
            -webkit-overflow-scrolling: touch;
          }

          .dashboard-card-list-item {
            align-items: flex-start;
          }

          .dashboard-card-list-item > div:first-child {
            margin-right: 0.5rem;
          }

          .dashboard-card-list-item .icon-link {
            padding: 0.35rem 0.65rem;
          }

          /* HIDE ICON DI SEBELAH TEKS "Dashboard Admin" KHUSUS MOBILE */
          .dashboard-header-icon {
            display: none;
          }
        }
      `}</style>
    </>
  );
};

export default DashboardAdmin;