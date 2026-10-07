import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import FormInput from '../../components/common/FormInput';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { companyProfileService } from '../../services/companyProfileService';
import { FiSave, FiSettings, FiFileText } from 'react-icons/fi';

const CompanyProfile = () => {
  const { refreshCompanyProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    taxRegistrationNumber: '',
    currencyCode: 'USD',
    currencySymbol: '$',
    defaultTaxRate: 0,
  });

  const [templateData, setTemplateData] = useState({
    name: 'Default Template',
    headerLayout: '',
    termsAndConditions: '',
    defaultNotes: '',
    footerText: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await companyProfileService.getProfile();
      const data = res.data;
      
      setProfileData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        taxRegistrationNumber: data.taxRegistrationNumber || '',
        currencyCode: data.currencyCode || 'USD',
        currencySymbol: data.currencySymbol || '$',
        defaultTaxRate: data.defaultTaxRate || 0,
      });

      if (data.quotationTemplates && data.quotationTemplates.length > 0) {
        const tpl = data.quotationTemplates[0];
        setTemplateData({
          name: tpl.name || 'Default Template',
          headerLayout: tpl.headerLayout || '',
          termsAndConditions: tpl.termsAndConditions || '',
          defaultNotes: tpl.defaultNotes || '',
          footerText: tpl.footerText || '',
        });
      }
    } catch (err) {
      console.error('Error loading company profile:', err);
      setError('Failed to load company profile configurations.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handleTemplateChange = (e) => {
    setTemplateData({
      ...templateData,
      [e.target.name]: e.target.value
    });
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setError('');
    setSuccess('');
    
    try {
      await companyProfileService.updateProfile(profileData);
      await refreshCompanyProfile(); // Update global auth context
      setSuccess('Company profile saved successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save company profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    setSavingTemplate(true);
    setError('');
    setSuccess('');
    
    try {
      await companyProfileService.updateTemplate(templateData);
      await refreshCompanyProfile();
      setSuccess('Quotation template saved successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save quotation template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner size="lg" text="Loading configurations..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Company Configuration
          </h1>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Settings */}
          <div className="card space-y-6">
            <div className="flex items-center space-x-2 text-xl font-bold text-gray-900 dark:text-white">
              <FiSettings className="text-primary-600" />
              <h2>General Settings</h2>
            </div>
            
            <form onSubmit={saveProfile} className="space-y-4">
              <FormInput label="Company Name" name="name" value={profileData.name} onChange={handleProfileChange} required />
              <FormInput label="Email" name="email" type="email" value={profileData.email} onChange={handleProfileChange} />
              <FormInput label="Phone" name="phone" value={profileData.phone} onChange={handleProfileChange} />
              <FormInput label="Address" name="address" value={profileData.address} onChange={handleProfileChange} />
              <FormInput label="Tax Registration Number" name="taxRegistrationNumber" value={profileData.taxRegistrationNumber} onChange={handleProfileChange} />
              
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Currency Code (e.g. USD)" name="currencyCode" value={profileData.currencyCode} onChange={handleProfileChange} required />
                <FormInput label="Currency Symbol (e.g. $)" name="currencySymbol" value={profileData.currencySymbol} onChange={handleProfileChange} required />
              </div>
              <FormInput label="Default Tax Rate (%)" name="defaultTaxRate" type="number" step="0.01" value={profileData.defaultTaxRate} onChange={handleProfileChange} />
              
              <button
                type="submit"
                disabled={savingProfile}
                className="btn btn-primary flex items-center justify-center space-x-2 w-full mt-4"
              >
                {savingProfile ? <LoadingSpinner size="sm" color="white" /> : <FiSave />}
                <span>Save General Settings</span>
              </button>
            </form>
          </div>

          {/* Default Quotation Template */}
          <div className="card space-y-6">
            <div className="flex items-center space-x-2 text-xl font-bold text-gray-900 dark:text-white">
              <FiFileText className="text-primary-600" />
              <h2>Quotation Draft Template</h2>
            </div>
            
            <form onSubmit={saveTemplate} className="space-y-4">
              <FormInput label="Template Name" name="name" value={templateData.name} onChange={handleTemplateChange} required />
              
              <div>
                <label className="label">Header Layout (Optional CSS/HTML hook)</label>
                <textarea
                  name="headerLayout"
                  value={templateData.headerLayout}
                  onChange={handleTemplateChange}
                  className="input h-24"
                  placeholder="Enter custom header text or styling..."
                ></textarea>
              </div>

              <div>
                <label className="label">Terms and Conditions</label>
                <textarea
                  name="termsAndConditions"
                  value={templateData.termsAndConditions}
                  onChange={handleTemplateChange}
                  className="input h-32"
                  placeholder="Enter default terms and conditions applied to quotes..."
                ></textarea>
              </div>

              <div>
                <label className="label">Default Notes</label>
                <textarea
                  name="defaultNotes"
                  value={templateData.defaultNotes}
                  onChange={handleTemplateChange}
                  className="input h-24"
                ></textarea>
              </div>

              <div>
                <label className="label">Footer Text</label>
                <textarea
                  name="footerText"
                  value={templateData.footerText}
                  onChange={handleTemplateChange}
                  className="input h-24"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={savingTemplate}
                className="btn btn-primary flex items-center justify-center space-x-2 w-full mt-4"
              >
                {savingTemplate ? <LoadingSpinner size="sm" color="white" /> : <FiSave />}
                <span>Save Template</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CompanyProfile;
