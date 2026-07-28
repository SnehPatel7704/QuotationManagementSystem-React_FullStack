import { companyService } from './companyService';
import api from './api';

// Mock the api module
jest.mock('./api');

describe('companyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear console.error mock
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('getCompanies', () => {
    it('should fetch companies successfully', async () => {
      const mockCompanies = [
        { id: 1, name: 'Company A', email: 'companyA@example.com' },
        { id: 2, name: 'Company B', email: 'companyB@example.com' },
      ];

      api.get.mockResolvedValue({ data: mockCompanies });

      const result = await companyService.getCompanies();

      expect(api.get).toHaveBeenCalledWith('/companies');
      expect(result).toEqual(mockCompanies);
    });

    it('should handle empty company list', async () => {
      api.get.mockResolvedValue({ data: [] });

      const result = await companyService.getCompanies();

      expect(result).toEqual([]);
    });

    it('should handle error with response message', async () => {
      const errorMessage = 'Database connection failed';
      api.get.mockRejectedValue({
        response: {
          data: {
            message: errorMessage,
          },
        },
      });

      await expect(companyService.getCompanies()).rejects.toThrow(errorMessage);
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching companies:',
        expect.any(Object)
      );
    });

    it('should handle error with nested error message', async () => {
      const errorMessage = 'Validation error';
      api.get.mockRejectedValue({
        response: {
          data: {
            error: {
              message: errorMessage,
            },
          },
        },
      });

      await expect(companyService.getCompanies()).rejects.toThrow(errorMessage);
    });

    it('should handle error without response message', async () => {
      api.get.mockRejectedValue({
        response: {
          data: {},
        },
      });

      await expect(companyService.getCompanies()).rejects.toThrow(
        'Failed to fetch companies. Please try again.'
      );
    });

    it('should handle network error without response', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      await expect(companyService.getCompanies()).rejects.toThrow(
        'Failed to fetch companies. Please try again.'
      );
    });

    it('should handle 401 unauthorized error', async () => {
      api.get.mockRejectedValue({
        response: {
          status: 401,
          data: {
            message: 'Unauthorized',
          },
        },
      });

      await expect(companyService.getCompanies()).rejects.toThrow('Unauthorized');
    });

    it('should handle 500 server error', async () => {
      api.get.mockRejectedValue({
        response: {
          status: 500,
          data: {
            message: 'Internal server error',
          },
        },
      });

      await expect(companyService.getCompanies()).rejects.toThrow('Internal server error');
    });
  });

  describe('getAll', () => {
    it('should call api.get with correct endpoint', async () => {
      const mockResponse = { data: [] };
      api.get.mockResolvedValue(mockResponse);

      const result = await companyService.getAll();

      expect(api.get).toHaveBeenCalledWith('/companies');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getById', () => {
    it('should fetch company by id', async () => {
      const mockCompany = { id: 1, name: 'Company A' };
      api.get.mockResolvedValue({ data: mockCompany });

      const result = await companyService.getById(1);

      expect(api.get).toHaveBeenCalledWith('/companies/1');
      expect(result).toEqual({ data: mockCompany });
    });
  });

  describe('create', () => {
    it('should create a new company', async () => {
      const newCompany = { name: 'New Company', email: 'new@example.com' };
      const mockResponse = { data: { id: 3, ...newCompany } };
      api.post.mockResolvedValue(mockResponse);

      const result = await companyService.create(newCompany);

      expect(api.post).toHaveBeenCalledWith('/companies', newCompany);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('update', () => {
    it('should update an existing company', async () => {
      const updatedCompany = { name: 'Updated Company', email: 'updated@example.com' };
      const mockResponse = { data: { id: 1, ...updatedCompany } };
      api.put.mockResolvedValue(mockResponse);

      const result = await companyService.update(1, updatedCompany);

      expect(api.put).toHaveBeenCalledWith('/companies/1', updatedCompany);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('delete', () => {
    it('should delete a company', async () => {
      const mockResponse = { data: { success: true } };
      api.delete.mockResolvedValue(mockResponse);

      const result = await companyService.delete(1);

      expect(api.delete).toHaveBeenCalledWith('/companies/1');
      expect(result).toEqual(mockResponse);
    });
  });
});
