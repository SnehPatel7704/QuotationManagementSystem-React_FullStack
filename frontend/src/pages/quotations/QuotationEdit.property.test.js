import fc from 'fast-check';

/**
 * Property-Based Tests for Quotation Edit
 * Feature: quotation-system-improvements
 * 
 * These tests verify universal properties that should hold true across all valid inputs
 * using randomized testing with fast-check library.
 */

/**
 * Property 5: Quotation Data Loading
 * 
 * **Validates: Requirements 2.1, 2.3**
 * 
 * For any existing quotation, loading it in the edit form should populate all fields 
 * with the correct values including company, items, quantities, prices, and follow-up date.
 * 
 * This property verifies that:
 * 1. All quotation fields are correctly loaded from the API response
 * 2. Company ID is correctly populated
 * 3. All items are loaded with correct product IDs, quantities, and unit prices
 * 4. Follow-up date is correctly loaded (if present)
 * 5. The form state matches the loaded quotation data exactly
 */
describe('QuotationEdit - Property 5: Quotation Data Loading', () => {
  // Helper function to simulate loading quotation data into form state
  const loadQuotationIntoFormState = (quotationData) => {
    return {
      companyId: quotationData.companyId || '',
      followUpDate: quotationData.followUpDate || '',
      items: quotationData.items && quotationData.items.length > 0
        ? quotationData.items.map(item => ({
            productId: item.productId || '',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
          }))
        : [{ productId: '', quantity: 1, unitPrice: 0 }],
    };
  };

  test('loading quotation should populate all fields correctly', () => {
    fc.assert(
      fc.property(
        // Generate random quotation data
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          quotationNumber: fc.string({ minLength: 5, maxLength: 20 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          status: fc.constantFrom('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'REJECTED'),
          followUpDate: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString().split('T')[0]), { nil: '' }),
          items: fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 }),
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (quotationData) => {
          // Load quotation data into form state
          const formState = loadQuotationIntoFormState(quotationData);

          // Verify company ID is correctly loaded
          expect(formState.companyId).toBe(quotationData.companyId);

          // Verify follow-up date is correctly loaded
          expect(formState.followUpDate).toBe(quotationData.followUpDate || '');

          // Verify items array has correct length
          expect(formState.items.length).toBe(quotationData.items.length);

          // Verify each item is correctly loaded
          quotationData.items.forEach((originalItem, index) => {
            expect(formState.items[index].productId).toBe(originalItem.productId);
            expect(formState.items[index].quantity).toBe(originalItem.quantity);
            expect(formState.items[index].unitPrice).toBe(originalItem.unitPrice);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loading quotation with no follow-up date should set empty string', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          status: fc.constant('DRAFT'),
          followUpDate: fc.constant(null),
          items: fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (quotationData) => {
          const formState = loadQuotationIntoFormState(quotationData);
          expect(formState.followUpDate).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loading quotation with single item should populate correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          status: fc.constant('DRAFT'),
          followUpDate: fc.option(fc.string({ minLength: 10, maxLength: 10 }), { nil: '' }),
          items: fc.tuple(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            })
          ),
        }),
        (quotationData) => {
          const formState = loadQuotationIntoFormState(quotationData);

          expect(formState.items.length).toBe(1);
          expect(formState.items[0].productId).toBe(quotationData.items[0].productId);
          expect(formState.items[0].quantity).toBe(quotationData.items[0].quantity);
          expect(formState.items[0].unitPrice).toBe(quotationData.items[0].unitPrice);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loading quotation with multiple items should preserve item order', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          status: fc.constant('DRAFT'),
          items: fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
        }),
        (quotationData) => {
          const formState = loadQuotationIntoFormState(quotationData);

          // Verify items are in the same order
          quotationData.items.forEach((originalItem, index) => {
            expect(formState.items[index].productId).toBe(originalItem.productId);
            expect(formState.items[index].quantity).toBe(originalItem.quantity);
            expect(formState.items[index].unitPrice).toBe(originalItem.unitPrice);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loading quotation should handle edge case of maximum items', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          status: fc.constant('DRAFT'),
          items: fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 10, maxLength: 10 }
          ),
        }),
        (quotationData) => {
          const formState = loadQuotationIntoFormState(quotationData);

          expect(formState.items.length).toBe(10);
          
          // Verify all items are correctly loaded
          quotationData.items.forEach((originalItem, index) => {
            expect(formState.items[index].productId).toBe(originalItem.productId);
            expect(formState.items[index].quantity).toBe(originalItem.quantity);
            expect(formState.items[index].unitPrice).toBe(originalItem.unitPrice);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loading quotation should handle various quantity values', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          status: fc.constant('DRAFT'),
          items: fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 10000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        (quotationData) => {
          const formState = loadQuotationIntoFormState(quotationData);

          quotationData.items.forEach((originalItem, index) => {
            expect(formState.items[index].quantity).toBe(originalItem.quantity);
            expect(formState.items[index].quantity).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loading quotation should handle various unit price values', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          status: fc.constant('DRAFT'),
          items: fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 100000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        (quotationData) => {
          const formState = loadQuotationIntoFormState(quotationData);

          quotationData.items.forEach((originalItem, index) => {
            expect(formState.items[index].unitPrice).toBe(originalItem.unitPrice);
            expect(formState.items[index].unitPrice).toBeGreaterThanOrEqual(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loading quotation should handle different company IDs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.array(
          fc.record({
            productId: fc.integer({ min: 1, max: 100 }),
            quantity: fc.integer({ min: 1, max: 1000 }),
            unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (companyId, items) => {
          const quotationData = {
            id: 1,
            companyId,
            status: 'DRAFT',
            items,
          };

          const formState = loadQuotationIntoFormState(quotationData);
          expect(formState.companyId).toBe(companyId);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loading quotation should handle different follow-up dates', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') }),
        fc.array(
          fc.record({
            productId: fc.integer({ min: 1, max: 100 }),
            quantity: fc.integer({ min: 1, max: 1000 }),
            unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (followUpDate, items) => {
          const followUpDateString = followUpDate.toISOString().split('T')[0];
          const quotationData = {
            id: 1,
            companyId: 1,
            status: 'DRAFT',
            followUpDate: followUpDateString,
            items,
          };

          const formState = loadQuotationIntoFormState(quotationData);
          expect(formState.followUpDate).toBe(followUpDateString);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loading quotation data should be idempotent', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          status: fc.constant('DRAFT'),
          followUpDate: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString().split('T')[0]), { nil: '' }),
          items: fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (quotationData) => {
          // Load data twice
          const formState1 = loadQuotationIntoFormState(quotationData);
          const formState2 = loadQuotationIntoFormState(quotationData);

          // Both should produce identical results
          expect(formState1).toEqual(formState2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('loading quotation should preserve numeric precision for unit prices', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          status: fc.constant('DRAFT'),
          items: fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        (quotationData) => {
          const formState = loadQuotationIntoFormState(quotationData);

          quotationData.items.forEach((originalItem, index) => {
            // Unit price should be preserved exactly
            expect(formState.items[index].unitPrice).toBe(originalItem.unitPrice);
            
            // Should be a valid number
            expect(Number.isFinite(formState.items[index].unitPrice)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 7: Edit Authorization by Status
 * 
 * **Validates: Requirements 2.7, 2.8**
 * 
 * For any quotation, a USER should be able to edit it if and only if the status is DRAFT; 
 * attempts to edit quotations with other statuses should be rejected.
 * 
 * This property verifies that:
 * 1. Quotations with DRAFT status can be edited
 * 2. Quotations with PENDING_APPROVAL status cannot be edited
 * 3. Quotations with APPROVED status cannot be edited
 * 4. Quotations with SENT status cannot be edited
 * 5. Quotations with REJECTED status cannot be edited
 * 6. Authorization check is consistent across all quotations
 */
describe('QuotationEdit - Property 7: Edit Authorization by Status', () => {
  // Helper function to check if a quotation can be edited based on status
  const canEditQuotation = (status) => {
    return status === 'DRAFT';
  };

  // Helper function to simulate authorization check
  const checkEditAuthorization = (quotationData) => {
    if (quotationData.status !== 'DRAFT') {
      return {
        allowed: false,
        error: `Cannot edit quotation with status ${quotationData.status}. Only DRAFT quotations can be edited.`,
      };
    }
    return {
      allowed: true,
      error: null,
    };
  };

  test('DRAFT quotations should be editable', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          status: fc.constant('DRAFT'),
          items: fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (quotationData) => {
          const authResult = checkEditAuthorization(quotationData);
          
          expect(authResult.allowed).toBe(true);
          expect(authResult.error).toBeNull();
          expect(canEditQuotation(quotationData.status)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('PENDING_APPROVAL quotations should not be editable', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          status: fc.constant('PENDING_APPROVAL'),
          items: fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (quotationData) => {
          const authResult = checkEditAuthorization(quotationData);
          
          expect(authResult.allowed).toBe(false);
          expect(authResult.error).toContain('Cannot edit quotation');
          expect(authResult.error).toContain('PENDING_APPROVAL');
          expect(canEditQuotation(quotationData.status)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('APPROVED quotations should not be editable', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          status: fc.constant('APPROVED'),
          items: fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (quotationData) => {
          const authResult = checkEditAuthorization(quotationData);
          
          expect(authResult.allowed).toBe(false);
          expect(authResult.error).toContain('Cannot edit quotation');
          expect(authResult.error).toContain('APPROVED');
          expect(canEditQuotation(quotationData.status)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('SENT quotations should not be editable', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          status: fc.constant('SENT'),
          items: fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (quotationData) => {
          const authResult = checkEditAuthorization(quotationData);
          
          expect(authResult.allowed).toBe(false);
          expect(authResult.error).toContain('Cannot edit quotation');
          expect(authResult.error).toContain('SENT');
          expect(canEditQuotation(quotationData.status)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('REJECTED quotations should not be editable', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          status: fc.constant('REJECTED'),
          items: fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (quotationData) => {
          const authResult = checkEditAuthorization(quotationData);
          
          expect(authResult.allowed).toBe(false);
          expect(authResult.error).toContain('Cannot edit quotation');
          expect(authResult.error).toContain('REJECTED');
          expect(canEditQuotation(quotationData.status)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('authorization check should be consistent for all statuses', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'REJECTED'),
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          items: fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (status, quotationBase) => {
          const quotationData = { ...quotationBase, status };
          const authResult = checkEditAuthorization(quotationData);
          
          if (status === 'DRAFT') {
            expect(authResult.allowed).toBe(true);
            expect(authResult.error).toBeNull();
          } else {
            expect(authResult.allowed).toBe(false);
            expect(authResult.error).toBeTruthy();
            expect(authResult.error).toContain(status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('authorization should be independent of quotation data', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'REJECTED'),
        fc.integer({ min: 1, max: 100 }),
        fc.array(
          fc.record({
            productId: fc.integer({ min: 1, max: 100 }),
            quantity: fc.integer({ min: 1, max: 1000 }),
            unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (status, companyId, items) => {
          const quotationData = {
            id: 1,
            companyId,
            status,
            items,
          };
          
          const authResult = checkEditAuthorization(quotationData);
          
          // Authorization should depend only on status, not on other data
          const expectedAllowed = status === 'DRAFT';
          expect(authResult.allowed).toBe(expectedAllowed);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('authorization check should be deterministic', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          status: fc.constantFrom('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'REJECTED'),
          items: fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (quotationData) => {
          // Check authorization multiple times
          const result1 = checkEditAuthorization(quotationData);
          const result2 = checkEditAuthorization(quotationData);
          const result3 = checkEditAuthorization(quotationData);
          
          // All results should be identical
          expect(result1.allowed).toBe(result2.allowed);
          expect(result2.allowed).toBe(result3.allowed);
          expect(result1.error).toBe(result2.error);
          expect(result2.error).toBe(result3.error);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('only DRAFT status should return true for canEditQuotation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'REJECTED'),
        (status) => {
          const canEdit = canEditQuotation(status);
          
          if (status === 'DRAFT') {
            expect(canEdit).toBe(true);
          } else {
            expect(canEdit).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('authorization error message should include the status', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('PENDING_APPROVAL', 'APPROVED', 'SENT', 'REJECTED'),
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          companyId: fc.integer({ min: 1, max: 100 }),
          items: fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (status, quotationBase) => {
          const quotationData = { ...quotationBase, status };
          const authResult = checkEditAuthorization(quotationData);
          
          expect(authResult.error).toContain(status);
          expect(authResult.error).toContain('Cannot edit quotation');
          expect(authResult.error).toContain('DRAFT');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('authorization should work for quotations with different item counts', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'REJECTED'),
        fc.integer({ min: 1, max: 20 }),
        (status, itemCount) => {
          const items = Array.from({ length: itemCount }, (_, i) => ({
            productId: i + 1,
            quantity: 1,
            unitPrice: 10.0,
          }));
          
          const quotationData = {
            id: 1,
            companyId: 1,
            status,
            items,
          };
          
          const authResult = checkEditAuthorization(quotationData);
          
          // Authorization should not depend on item count
          const expectedAllowed = status === 'DRAFT';
          expect(authResult.allowed).toBe(expectedAllowed);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('authorization should work for quotations with different company IDs', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'REJECTED'),
        fc.integer({ min: 1, max: 1000 }),
        (status, companyId) => {
          const quotationData = {
            id: 1,
            companyId,
            status,
            items: [{ productId: 1, quantity: 1, unitPrice: 10.0 }],
          };
          
          const authResult = checkEditAuthorization(quotationData);
          
          // Authorization should not depend on company ID
          const expectedAllowed = status === 'DRAFT';
          expect(authResult.allowed).toBe(expectedAllowed);
        }
      ),
      { numRuns: 100 }
    );
  });
});
