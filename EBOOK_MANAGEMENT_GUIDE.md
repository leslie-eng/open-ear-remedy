# Ebook Management Guide

## How to Add Ebooks to Your Store

You now have a complete ebook management system! Here are the different ways to add ebooks:

## 🎯 **Method 1: Admin Interface (Recommended)**

### Access the Admin Panel
1. **Navigate to Admin Dashboard**: Go to `/admin-dashboard` 
2. **Click "Ebook Store"** button in the navigation
3. **Or directly visit**: `/admin/ebook-management`

### Add New Ebooks
1. **Click "Add New Ebook"** button
2. **Fill out the form**:
   - **Title** (required): The ebook title
   - **Author** (required): Author name
   - **Short Description** (required): Brief description for cards
   - **Full Description** (required): Detailed description for detail page
   - **Price** (required): Price in USD
   - **Category** (required): Select from predefined categories
   - **File Format** (required): PDF or EPUB
   - **File URL** (required): Direct link to the ebook file
   - **Cover Image URL** (optional): Link to cover image
   - **File Size** (optional): Size in bytes
   - **Publication Date** (optional): When it was published
   - **ISBN** (optional): ISBN number
   - **Sample Pages URL** (optional): Link to sample/preview
   - **Active** (checkbox): Whether to show in store

3. **Click "Add Ebook"** to save

### Manage Existing Ebooks
- **Edit**: Click the edit icon (pencil) next to any ebook
- **Delete**: Click the delete icon (trash) to remove
- **Toggle Active/Inactive**: Click the status badge to show/hide from store

## 🔧 **Method 2: Direct Data Entry**

### For Developers/Advanced Users
You can also directly modify the data by editing the localStorage:

```javascript
// Get current ebooks
const ebooks = JSON.parse(localStorage.getItem('admin-ebooks') || '[]');

// Add new ebook
const newEbook = {
  id: Date.now().toString(),
  title: "Your Ebook Title",
  author: "Author Name",
  description: "Full description...",
  short_description: "Brief description",
  price: 19.99,
  category: "mental-wellness", // or other categories
  cover_image_url: "https://example.com/cover.jpg",
  file_url: "https://example.com/ebook.pdf",
  file_format: "PDF", // or "EPUB"
  file_size: 2048000, // in bytes
  publication_date: "2024-01-01",
  isbn: "978-1234567890",
  sample_pages_url: "https://example.com/sample.pdf",
  is_active: true
};

// Add to array and save
ebooks.push(newEbook);
localStorage.setItem('admin-ebooks', JSON.stringify(ebooks));

// Refresh the page to see changes
window.location.reload();
```

## 📁 **File Hosting Options**

For the **File URL** and **Cover Image URL**, you can use:

### Option 1: Public Folder (Simple)
1. Put files in `/public/ebooks/` folder
2. Use URLs like: `/ebooks/my-ebook.pdf`

### Option 2: Cloud Storage (Recommended)
- **AWS S3**: Upload files and use public URLs
- **Google Drive**: Share files and use direct links
- **Dropbox**: Use public sharing links
- **GitHub**: Host files in a repository
- **Cloudinary**: For images and documents

### Option 3: CDN Services
- **jsDelivr**: Free CDN for GitHub files
- **Netlify**: Static file hosting
- **Vercel**: Static assets hosting

## 🎨 **Cover Image Guidelines**

- **Recommended size**: 300x400 pixels (3:4 aspect ratio)
- **Format**: JPG or PNG
- **File size**: Under 500KB for fast loading
- **Quality**: High resolution for crisp display

## 📚 **Categories Available**

- `mental-wellness`: Mental Wellness
- `self-help`: Self-Help  
- `anxiety-management`: Anxiety Management
- `depression-support`: Depression Support
- `mindfulness`: Mindfulness
- `relationships`: Relationships

## 🔄 **Data Persistence**

Currently, ebooks are stored in **localStorage**, which means:
- ✅ **Persists** across browser sessions
- ✅ **Fast** loading and saving
- ⚠️ **Browser-specific** (each browser has its own data)
- ⚠️ **Can be cleared** if user clears browser data

### For Production Use
Consider upgrading to:
- **Database storage** (PostgreSQL, MySQL)
- **Supabase** (already integrated in your app)
- **Firebase Firestore**
- **MongoDB**

## 🚀 **Quick Start Example**

1. **Go to**: `http://localhost:3001/admin/ebook-management`
2. **Click**: "Add New Ebook"
3. **Fill in**:
   - Title: "Stress Management 101"
   - Author: "Dr. Jane Smith"
   - Short Description: "Learn effective stress management techniques"
   - Full Description: "A comprehensive guide to managing stress in daily life..."
   - Price: 14.99
   - Category: Mental Wellness
   - File Format: PDF
   - File URL: "/ebooks/stress-management.pdf"
4. **Click**: "Add Ebook"
5. **Visit**: `http://localhost:3001/ebook-store` to see your new ebook!

## 🎯 **Tips for Success**

1. **Start Small**: Add 3-5 ebooks initially
2. **Good Descriptions**: Write compelling descriptions
3. **Competitive Pricing**: Research similar ebook prices
4. **Quality Images**: Use professional-looking covers
5. **Test Everything**: Always test the complete purchase flow
6. **Regular Updates**: Keep adding new content regularly

## 🔧 **Troubleshooting**

### Ebook Not Showing in Store?
- Check if `is_active` is set to `true`
- Refresh the ebook store page
- Check browser console for errors

### File Not Downloading?
- Verify the `file_url` is accessible
- Test the URL directly in browser
- Check file permissions

### Images Not Loading?
- Verify `cover_image_url` is accessible
- Use absolute URLs (https://...)
- Check image file format (JPG/PNG)

---

**Your ebook store is now ready! Start adding your mental wellness content and watch your digital library grow! 📚✨**