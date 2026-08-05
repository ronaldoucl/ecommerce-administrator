import api from './api';

/**
 * Upload service — wraps the `/uploads` endpoints from the API contract.
 *
 * Uploading is a two-step flow by design: this endpoint only turns a file into a
 * hosted URL. That URL is then saved like any other in the product's `images`
 * array, so the product endpoints (and the database schema) know nothing about
 * files. Pasting a URL by hand remains a fully supported alternative.
 */
const uploadService = {
  /**
   * Upload one image file and return where it is now hosted.
   * POST /api/uploads/image (protected)
   *
   * @param {File} file - an image file (jpeg/png/webp/gif/avif, max 5 MB)
   * @returns {Promise<{ url: string, publicId: string, width: number,
   *   height: number, format: string, bytes: number }>}
   */
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    // The shared instance defaults to application/json. Clearing the header lets
    // the browser set multipart/form-data WITH the boundary, which it must do
    // itself — a hand-written value would be missing the boundary and fail.
    const { data } = await api.post('/uploads/image', formData, {
      headers: { 'Content-Type': undefined },
    });

    return data;
  },
};

export default uploadService;
