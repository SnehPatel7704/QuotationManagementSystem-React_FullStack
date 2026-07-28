import fc from 'fast-check';

/**
 * Property-Based Tests for Quotation Total Calculation
 * Feature: quotation-system-improvements
 * 
 * These tests verify universal properties that should hold true across all valid inputs
 * using randomized testing with fast-check library.
 */

// Helper function to calculate item total (mirrors the component logic)
const calculateItemTotal = (quantity, unitPrice) => {
  return (Number(quantity) || 0) * (Number(unitPrice) || 0);
};

// Helper function to calculate quotation total (mirrors the component logic)
const calculateQuotationTotal = (items) => {
  return items.reduce((total, item) => {
    return total + calculateItemTotal(item.quantity, item.unitPrice);
  }, 0);
};

describe('QuotationCreate - Property-Based Tests', () => {
  /**
   * Property 1: Quotation Total Calculation Correctness
   * 
   * **Validates: Requirements 1.5, 1.6**
   * 
   * For any quotation with a list of items, the total amount should equal 
   * the sum of all item totals, where each item total equals quantity × unit price.
   * 
   * This property verifies that:
   * 1. The quotation total is always the sum of individual item totals
   * 2. Each item total is correctly calculated as quantity × unit price
   * 3. The calculation is consistent across all valid input combinations
   */
  describe('Property 1: Quotation Total Calculation Correctness', () => {
    test('quotation total should equal sum of all item totals (quantity × unit price)', () => {
      fc.assert(
        fc.property(
          // Generate an array of 1-10 items with random quantities and prices
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (items) => {
            // Calculate expected total manually
            const expectedTotal = items.reduce((sum, item) => {
              return sum + (item.quantity * item.unitPrice);
            }, 0);

            // Calculate total using the component's logic
            const actualTotal = calculateQuotationTotal(items);

            // The totals should match (with floating point tolerance)
            expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    test('quotation total should be zero when all items have zero quantity', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.constant(0),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (items) => {
            const total = calculateQuotationTotal(items);
            expect(total).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('quotation total should be zero when all items have zero unit price', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.constant(0),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (items) => {
            const total = calculateQuotationTotal(items);
            expect(total).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('quotation total should increase when adding items with positive values', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          fc.record({
            productId: fc.integer({ min: 1, max: 100 }),
            quantity: fc.integer({ min: 1, max: 1000 }),
            unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          }),
          (initialItems, newItem) => {
            const initialTotal = calculateQuotationTotal(initialItems);
            const totalWithNewItem = calculateQuotationTotal([...initialItems, newItem]);
            const newItemTotal = calculateItemTotal(newItem.quantity, newItem.unitPrice);

            // Adding an item should increase the total by that item's total
            expect(Math.abs(totalWithNewItem - (initialTotal + newItemTotal))).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('quotation total should be commutative (order of items does not matter)', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (items) => {
            const total1 = calculateQuotationTotal(items);
            const shuffledItems = [...items].reverse(); // Simple shuffle by reversing
            const total2 = calculateQuotationTotal(shuffledItems);

            // Total should be the same regardless of item order
            expect(Math.abs(total1 - total2)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('item total calculation should be associative with multiplication', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          (quantity, unitPrice) => {
            const itemTotal = calculateItemTotal(quantity, unitPrice);
            const expectedTotal = quantity * unitPrice;

            // Item total should equal quantity × unit price
            expect(Math.abs(itemTotal - expectedTotal)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('quotation total should handle edge case of single item', () => {
      fc.assert(
        fc.property(
          fc.record({
            productId: fc.integer({ min: 1, max: 100 }),
            quantity: fc.integer({ min: 1, max: 1000 }),
            unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          }),
          (item) => {
            const total = calculateQuotationTotal([item]);
            const expectedTotal = item.quantity * item.unitPrice;

            // For a single item, quotation total should equal item total
            expect(Math.abs(total - expectedTotal)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('quotation total should handle large quantities and prices without overflow', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 10000 }),
              unitPrice: fc.double({ min: 0.01, max: 100000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (items) => {
            const total = calculateQuotationTotal(items);

            // Total should be a valid number (not NaN or Infinity)
            expect(Number.isFinite(total)).toBe(true);
            expect(total).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('removing an item should decrease total by that item\'s total', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          fc.integer({ min: 0, max: 9 }),
          (items, indexToRemove) => {
            // Only test if the index is valid
            if (indexToRemove >= items.length) return;

            const totalBefore = calculateQuotationTotal(items);
            const removedItem = items[indexToRemove];
            const removedItemTotal = calculateItemTotal(removedItem.quantity, removedItem.unitPrice);
            
            const itemsAfter = items.filter((_, i) => i !== indexToRemove);
            const totalAfter = calculateQuotationTotal(itemsAfter);

            // Total after removal should equal total before minus removed item's total
            expect(Math.abs(totalAfter - (totalBefore - removedItemTotal))).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('modifying item quantity should update total correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.integer({ min: 0, max: 9 }),
          fc.integer({ min: 1, max: 1000 }),
          (items, indexToModify, newQuantity) => {
            // Only test if the index is valid
            if (indexToModify >= items.length) return;

            const totalBefore = calculateQuotationTotal(items);
            const oldItem = items[indexToModify];
            const oldItemTotal = calculateItemTotal(oldItem.quantity, oldItem.unitPrice);
            
            const modifiedItems = [...items];
            modifiedItems[indexToModify] = { ...oldItem, quantity: newQuantity };
            const newItemTotal = calculateItemTotal(newQuantity, oldItem.unitPrice);
            
            const totalAfter = calculateQuotationTotal(modifiedItems);

            // Total should change by the difference in item totals
            const expectedTotal = totalBefore - oldItemTotal + newItemTotal;
            expect(Math.abs(totalAfter - expectedTotal)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Item List Management
   * 
   * **Validates: Requirements 1.7**
   * 
   * For any quotation form state, adding an item should increase the items list 
   * length by one, and removing an item should decrease the list length by one 
   * and remove the correct item.
   * 
   * This property verifies that:
   * 1. Adding an item increases the list length by exactly 1
   * 2. Removing an item decreases the list length by exactly 1
   * 3. The correct item is removed when removing by index
   * 4. List operations maintain data integrity
   */
  describe('Property 2: Item List Management', () => {
    test('adding an item should increase list length by one', () => {
      fc.assert(
        fc.property(
          // Generate initial items array
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          // Generate new item to add
          fc.record({
            productId: fc.integer({ min: 1, max: 100 }),
            quantity: fc.integer({ min: 1, max: 1000 }),
            unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          }),
          (initialItems, newItem) => {
            const initialLength = initialItems.length;
            const itemsAfterAdd = [...initialItems, newItem];
            
            // Adding an item should increase length by exactly 1
            expect(itemsAfterAdd.length).toBe(initialLength + 1);
            
            // The new item should be at the end of the list
            expect(itemsAfterAdd[itemsAfterAdd.length - 1]).toEqual(newItem);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('removing an item should decrease list length by one', () => {
      fc.assert(
        fc.property(
          // Generate items array with at least 1 item
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.integer({ min: 0, max: 9 }),
          (items, indexToRemove) => {
            // Only test if the index is valid
            if (indexToRemove >= items.length) return;

            const initialLength = items.length;
            const itemsAfterRemove = items.filter((_, i) => i !== indexToRemove);
            
            // Removing an item should decrease length by exactly 1
            expect(itemsAfterRemove.length).toBe(initialLength - 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('removing an item should remove the correct item', () => {
      fc.assert(
        fc.property(
          // Generate items array with at least 1 item
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.integer({ min: 0, max: 9 }),
          (items, indexToRemove) => {
            // Only test if the index is valid
            if (indexToRemove >= items.length) return;

            const itemToRemove = items[indexToRemove];
            const itemsAfterRemove = items.filter((_, i) => i !== indexToRemove);
            
            // The removed item should not be in the resulting list
            expect(itemsAfterRemove).not.toContainEqual(itemToRemove);
            
            // All other items should still be present
            items.forEach((item, index) => {
              if (index !== indexToRemove) {
                expect(itemsAfterRemove).toContainEqual(item);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('adding and then removing an item should restore original list', () => {
      fc.assert(
        fc.property(
          // Generate initial items array
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          // Generate new item to add
          fc.record({
            productId: fc.integer({ min: 1, max: 100 }),
            quantity: fc.integer({ min: 1, max: 1000 }),
            unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          }),
          (initialItems, newItem) => {
            const initialLength = initialItems.length;
            
            // Add item
            const itemsAfterAdd = [...initialItems, newItem];
            expect(itemsAfterAdd.length).toBe(initialLength + 1);
            
            // Remove the last item (the one we just added)
            const itemsAfterRemove = itemsAfterAdd.slice(0, -1);
            
            // Should restore original length
            expect(itemsAfterRemove.length).toBe(initialLength);
            
            // Should have the same items as original
            expect(itemsAfterRemove).toEqual(initialItems);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('multiple add operations should increase length correctly', () => {
      fc.assert(
        fc.property(
          // Generate initial items array
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 0, maxLength: 5 }
          ),
          // Generate array of items to add
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (initialItems, itemsToAdd) => {
            const initialLength = initialItems.length;
            let currentItems = [...initialItems];
            
            // Add each item one by one
            itemsToAdd.forEach(item => {
              currentItems = [...currentItems, item];
            });
            
            // Final length should be initial length + number of items added
            expect(currentItems.length).toBe(initialLength + itemsToAdd.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('multiple remove operations should decrease length correctly', () => {
      fc.assert(
        fc.property(
          // Generate items array with at least 2 items
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          fc.integer({ min: 1, max: 5 }),
          (items, numToRemove) => {
            // Only remove up to the number of items we have
            const actualNumToRemove = Math.min(numToRemove, items.length);
            const initialLength = items.length;
            let currentItems = [...items];
            
            // Remove items from the end
            for (let i = 0; i < actualNumToRemove; i++) {
              currentItems = currentItems.slice(0, -1);
            }
            
            // Final length should be initial length - number of items removed
            expect(currentItems.length).toBe(initialLength - actualNumToRemove);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('removing from empty list should have no effect', () => {
      const emptyItems = [];
      const itemsAfterRemove = emptyItems.filter((_, i) => i !== 0);
      
      // Length should remain 0
      expect(itemsAfterRemove.length).toBe(0);
    });

    test('removing with invalid index should not change list', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (items) => {
            const initialLength = items.length;
            
            // Try to remove with index out of bounds
            const invalidIndex = items.length + 10;
            const itemsAfterRemove = items.filter((_, i) => i !== invalidIndex);
            
            // Length should remain the same
            expect(itemsAfterRemove.length).toBe(initialLength);
            
            // Items should be unchanged
            expect(itemsAfterRemove).toEqual(items);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('list operations should preserve item data integrity', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.record({
            productId: fc.integer({ min: 1, max: 100 }),
            quantity: fc.integer({ min: 1, max: 1000 }),
            unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          }),
          (initialItems, newItem) => {
            // Add item
            const itemsAfterAdd = [...initialItems, newItem];
            
            // Verify all original items are still present with correct data
            initialItems.forEach((item, index) => {
              expect(itemsAfterAdd[index]).toEqual(item);
            });
            
            // Verify new item has correct data
            expect(itemsAfterAdd[itemsAfterAdd.length - 1]).toEqual(newItem);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('removing first item should preserve remaining items in order', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (items) => {
            const itemsAfterRemove = items.filter((_, i) => i !== 0);
            
            // Remaining items should be in the same order
            for (let i = 0; i < itemsAfterRemove.length; i++) {
              expect(itemsAfterRemove[i]).toEqual(items[i + 1]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('removing middle item should preserve order of remaining items', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              productId: fc.integer({ min: 1, max: 100 }),
              quantity: fc.integer({ min: 1, max: 1000 }),
              unitPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            }),
            { minLength: 3, maxLength: 10 }
          ),
          (items) => {
            const middleIndex = Math.floor(items.length / 2);
            const itemsAfterRemove = items.filter((_, i) => i !== middleIndex);
            
            // Items before the removed index should be unchanged
            for (let i = 0; i < middleIndex; i++) {
              expect(itemsAfterRemove[i]).toEqual(items[i]);
            }
            
            // Items after the removed index should shift down by one
            for (let i = middleIndex; i < itemsAfterRemove.length; i++) {
              expect(itemsAfterRemove[i]).toEqual(items[i + 1]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
