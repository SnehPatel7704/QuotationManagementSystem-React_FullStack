import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import UpcomingFollowups from './UpcomingFollowups';
import api from '../../services/api';
import { FiFileText, FiUsers, FiBriefcase, FiPackage, FiTrendingUp } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const { user, companyProfile } = useAuth();
  const currencySymbol = companyProfile?.currencySymbol || 'OMR';
  const currencyCode = companyProfile?.currencyCode || 'OMR';
  const [analytics, setAnalytics] = useState(null);
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  const getStatusBadgeClasses = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'SENT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
    }
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/quotations/analytics');
        setAnalytics(response.data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };
    fetchAnalytics();
  }, []);

  const cards = [
    {
      title: 'Quotations',
      icon: FiFileText,
      link: '/quotations',
      color: 'bg-blue-500',
      description: 'Manage all quotations',
      show: true,
    },
    {
      title: 'Companies',
      icon: FiBriefcase,
      link: '/companies',
      color: 'bg-green-500',
      description: 'Manage companies',
      show: user?.role === 'SUPERADMIN' || user?.role === 'ADMIN',
    },
    {
      title: 'Products',
      icon: FiPackage,
      link: '/products',
      color: 'bg-purple-500',
      description: 'Manage products',
      show: user?.role === 'SUPERADMIN' || user?.role === 'ADMIN',
    },
    {
      title: 'Users',
      icon: FiUsers,
      link: '/users',
      color: 'bg-red-500',
      description: 'Manage system users',
      show: user?.role === 'SUPERADMIN',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
        {/* Welcome Section */}
        <div className="card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <FiTrendingUp size={24} className="sm:w-8 sm:h-8 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user?.username}!
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Role: <span className="font-semibold text-primary-600 dark:text-primary-400">{user?.role}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Analytics Summary */}
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-6">
            <div className="card bg-blue-50 dark:bg-gray-800 p-4 rounded-xl border-l-4 border-blue-500">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{currencySymbol} {analytics.metrics.totalRevenue.toFixed(2)}</h3>
            </div>
            <div className="card bg-green-50 dark:bg-gray-800 p-4 rounded-xl border-l-4 border-green-500">
              <p className="text-sm text-gray-500 dark:text-gray-400">Approved Quotes</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.metrics.approvedCount}</h3>
            </div>
            <div className="card bg-yellow-50 dark:bg-gray-800 p-4 rounded-xl border-l-4 border-yellow-500">
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approvals</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.metrics.pendingCount}</h3>
            </div>
            <div className="card bg-purple-50 dark:bg-gray-800 p-4 rounded-xl border-l-4 border-purple-500">
              <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.metrics.winRate}%</h3>
            </div>
          </div>
        )}

        {/* Charts */}
        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Monthly Quoted Revenue</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} name={`Revenue (${currencyCode})`} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Status Distribution</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                      {analytics.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Quick Access Cards */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
            Quick Access
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {cards.filter(card => card.show).map((card, index) => (
              <Link
                key={index}
                to={card.link}
                className="group card hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
                  <div className={`${card.color} w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <card.icon size={28} className="sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {card.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {analytics && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Recent Activity
              </h2>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Last 8 updates
              </span>
            </div>

            {analytics.recentActivity && analytics.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentActivity.map((item) => {
                  const statusValue = item.newStatus || item.oldStatus || 'UPDATED';
                  const statusText = statusValue.replace(/_/g, ' ');

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {item.quotationNumber}
                          </span>
                          <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {item.action}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.actor} • {new Date(item.createdAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.notes && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">{item.notes}</span>
                        )}
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(statusValue)}`}>
                          {statusText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FiFileText size={32} className="mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                <p>No recent activity has been recorded yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Follow-ups Widget - Only for ADMIN and SUPERADMIN */}
        {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
          <UpcomingFollowups />
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
