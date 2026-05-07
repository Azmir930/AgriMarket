/**
 * Utility function to convert image URLs to absolute format
 * Handles relative paths from API endpoints that are served from XAMPP
 * while frontend runs on different port
 */
export const getImageUrl = (imageUrl: string | undefined | null): string => {
    if (!imageUrl) {
        return '/placeholder.svg';
    }

    // If already an absolute URL, return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }

    // If it's a relative path to uploads, prepend localhost
    if (imageUrl.startsWith('/uploads/')) {
        return `http://localhost${imageUrl}`;
    }

    // For other relative paths, return as-is (will use from current domain)
    return imageUrl;
};
