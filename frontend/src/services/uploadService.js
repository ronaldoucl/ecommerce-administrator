import api from './api';

// Uploading is two steps on purpose: this endpoint only turns a file into a
// hosted URL, and that URL is then saved in the product's `images` like any
// other. So the database never knows a file was involved, and pasting a URL by
// hand still works exactly the same.
const uploadService = {
  // POST /api/uploads/image — admin only. jpeg/png/webp/gif/avif, max 5 MB.
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    // api.js sends application/json by default. We have to clear it so the
    // browser can set multipart/form-data itself — it needs to add the boundary,
    // and writing the header by hand would leave that out and break the upload.
    const { data } = await api.post('/uploads/image', formData, {
      headers: { 'Content-Type': undefined },
    });

    return data;
  },
};

export default uploadService;
