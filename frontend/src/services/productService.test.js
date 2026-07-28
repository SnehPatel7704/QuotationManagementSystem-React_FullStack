import { productService } from './productService';
import api from './api';

// Mock the api module
jest.mock('./api');

describe('productService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear console.error mock
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('getProducts', () => {
    it('should fetch products successfully', async () => {
      const mockProducts = [
        { id: 1, name: 'Product A', price: 100 },
        { id: 2, name: 'Product B', price: 200 },
      ];

      api.get.mockResolvedValue({ data: mockProducts });

      const result = await productService.getProducts();

      expect(api.get).toHaveBeenCalledWith('/products');
      expect(result).toEqual(mockProducts);
    });

    it('should handle empty product list', async () => {
      api.get.mockResolvedValue({ data: [] });

      const result = await productService.getProducts();

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

      await expect(productService.getProducts()).rejects.toThrow(errorMessage);
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching products:',
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

      await expect(productService.getProducts()).rejects.toThrow(errorMessage);
    });

    it('should handle error without response message', async () => {
      api.get.mockRejectedValue({
        response: {
          data: {},
        },
      });

      await expect(productService.getProducts()).rejects.toThrow(
        'Failed to fetch products. Please try again.'
      );
    });

    it('should handle network error without response', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      await expect(productService.getProducts()).rejects.toThrow(
        'Failed to fetch products. Please try again.'
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

      await expect(productService.getProducts()).rejects.toThrow('Unauthorized');
    });

    it('should handle 403 forbidden error', async () => {
      api.get.mockRejectedValue({
        response: {
          status: 403,
          data: {
            message: 'Forbidden',
          },
        },
      });

      await expect(productService.getProducts()).rejects.toThrow('Forbidden');
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

      await expect(productService.getProducts()).rejects.toThrow('Internal server error');
    });
  });

  describe('getAll', () => {
    it('should call api.get with correct endpoint', async () => {
      const mockResponse = { data: [] };
      api.get.mockResolvedValue(mockResponse);

      const result = await productService.getAll();

      expect(api.get).toHaveBeenCalledWith('/products');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getById', () => {
    it('should fetch product by id', async () => {
      const mockProduct = { id: 1, name: 'Product A', price: 100 };
      api.get.mockResolvedValue({ data: mockProduct });

      const result = await productService.getById(1);

      expect(api.get).toHaveBeenCalledWith('/products/1');
      expect(result).toEqual({ data: mockProduct });
    });
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const newProduct = { name: 'New Product', price: 150 };
      const mockResponse = { data: { id: 3, ...newProduct } };
      api.post.mockResolvedValue(mockResponse);

      const result = await productService.create(newProduct);

      expect(api.post).toHaveBeenCalledWith('/products', newProduct);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('update', () => {
    it('should update an existing product', async () => {
      const updatedProduct = { name: 'Updated Product', price: 250 };
      const mockResponse = { data: { id: 1, ...updatedProduct } };
      api.put.mockResolvedValue(mockResponse);

      const result = await productService.update(1, updatedProduct);

      expect(api.put).toHaveBeenCalledWith('/products/1', updatedProduct);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('delete', () => {
    it('should delete a product', async () => {
      const mockResponse = { data: { success: true } };
      api.delete.mockResolvedValue(mockResponse);

      const result = await productService.delete(1);

      expect(api.delete).toHaveBeenCalledWith('/products/1');
      expect(result).toEqual(mockResponse);
    });
  });
});
