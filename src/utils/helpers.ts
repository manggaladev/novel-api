/**
 * Utility Functions
 * Shared helper functions for the Novel API
 */

import sanitizeHtml from 'sanitize-html';

/**
 * Extract string param from Express 5 params (string | string[])
 */
export const getParam = (param: string | string[] | undefined): string => {
  if (!param) return '';
  return Array.isArray(param) ? param[0] : param;
};

/**
 * Generate URL-friendly slug from title
 */
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')      // Replace spaces with -
    .replace(/-+/g, '-')       // Replace multiple - with single -
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing -
};

/**
 * Generate unique slug by appending number if exists
 */
export const generateUniqueSlug = async (
  title: string, 
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> => {
  let slug = generateSlug(title);
  let counter = 1;
  let uniqueSlug = slug;

  while (await checkExists(uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
};

/**
 * Sanitize string - remove dangerous HTML content
 */
export const sanitizeString = (str: string): string => {
  if (!str) return '';
  
  return sanitizeHtml(str, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
    allowProtocolRelative: false,
  }).trim();
};

/**
 * Sanitize HTML content allowing safe tags
 * Use for chapter content, synopsis, etc.
 */
export const sanitizeHtmlContent = (str: string): string => {
  if (!str) return '';
  
  return sanitizeHtml(str, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 'i', 'b',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'hr', 'span', 'div'
    ],
    allowedAttributes: {
      'div': ['class'],
      'span': ['class'],
    },
    allowProtocolRelative: false,
  }).trim();
};

/**
 * Calculate word count from text
 */
export const countWords = (text: string): number => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Build pagination metadata
 */
export const buildPaginationMeta = (total: number, page: number, limit: number) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

/**
 * Format date for display
 */
export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Calculate average rating
 */
export const calculateAverageRating = (ratings: { score: number }[]): number => {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, r) => acc + r.score, 0);
  return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
};
