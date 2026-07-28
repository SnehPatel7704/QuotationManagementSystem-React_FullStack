import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import UpcomingFollowups from './UpcomingFollowups';
import { FiFileText, FiUsers, FiBriefcase, FiPackage, FiTrendingUp } from 'react-icons/fi';

const Dashboard = () => {
  const { user } = useAuth();

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

        {/* Role-based Access Info */}
        {/* <div className="card bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 border-l-4 border-primary-600">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3">
            Your Access Level
          </h2>
          {user?.role === 'SUPERADMIN' && (
            <div className="space-y-2 text-sm sm:text-base text-gray-700 dark:text-gray-300">
              <p className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></span>
                <span>Full system access including user management</span>
              </p>
              <p className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></span>
                <span>Create, edit, approve, and delete quotations</span>
              </p>
              <p className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></span>
                <span>Manage companies, products, and users</span>
              </p>
            </div>
          )}
          {user?.role === 'ADMIN' && (
            <div className="space-y-2 text-sm sm:text-base text-gray-700 dark:text-gray-300">
              <p className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></span>
                <span>Create, edit, and approve quotations</span>
              </p>
              <p className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></span>
                <span>Manage companies and products</span>
              </p>
              <p className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></span>
                <span>Send quotations to clients</span>
              </p>
            </div>
          )}
          {user?.role === 'USER' && (
            <div className="space-y-2 text-sm sm:text-base text-gray-700 dark:text-gray-300">
              <p className="flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 flex-shrink-0"></span>
                <span>View quotations</span>
              </p>
              <p className="flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 flex-shrink-0"></span>
                <span>View companies and products</span>
              </p>
            </div>
          )}
        </div> */}

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

        {/* Recent Activity Placeholder */}
        {/* <div className="card">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
            <FiFileText size={40} className="sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm sm:text-base">No recent activity to display</p>
          </div>
        </div> */}

        {/* Upcoming Follow-ups Widget - Only for ADMIN and SUPERADMIN */}
        {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
          <UpcomingFollowups />
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
