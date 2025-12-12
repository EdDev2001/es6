// src/routes/api/admin/upload/+server.js
import { json } from '@sveltejs/kit';
import { verifyAccessToken } from '$lib/server/adminAuth.js';
import { adminDb, adminStorage } from '$lib/server/firebase-admin.js';

export async function POST({ request }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        const formData = await request.formData();
        const file = formData.get('file');
        const type = formData.get('type') || 'general';
        
        if (!file || !(file instanceof File)) {
            return json({ error: 'No file provided' }, { status: 400 });
        }
        
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 });
        }
        
        // Validate file type for images
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        const isImage = type.includes('image');
        
        if (isImage && !allowedImageTypes.includes(file.type)) {
            return json({ error: 'Invalid image type. Allowed: JPEG, PNG, GIF, WebP' }, { status: 400 });
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const ext = file.name.split('.').pop();
        const filename = `${type}/${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
        
        // If Firebase Storage is available, upload there
        if (adminStorage) {
            const bucket = adminStorage.bucket();
            const fileBuffer = Buffer.from(await file.arrayBuffer());
            const fileRef = bucket.file(`uploads/${filename}`);
            
            await fileRef.save(fileBuffer, {
                metadata: {
                    contentType: file.type,
                    metadata: {
                        uploadedBy: admin.id,
                        originalName: file.name,
                        type: type
                    }
                }
            });
            
            // Make file publicly accessible
            await fileRef.makePublic();
            
            const url = `https://storage.googleapis.com/${bucket.name}/uploads/${filename}`;
            
            // Log upload
            if (adminDb) {
                await adminDb.ref('uploads').push({
                    filename,
                    originalName: file.name,
                    type,
                    size: file.size,
                    mimeType: file.type,
                    url,
                    uploadedBy: admin.id,
                    createdAt: new Date().toISOString()
                });
            }
            
            return json({ url, filename, size: file.size });
        }
        
        // Fallback: Store as base64 in database (not recommended for production)
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;
        
        if (adminDb) {
            const uploadRef = adminDb.ref('uploads').push();
            await uploadRef.set({
                filename,
                originalName: file.name,
                type,
                size: file.size,
                mimeType: file.type,
                data: dataUrl,
                uploadedBy: admin.id,
                createdAt: new Date().toISOString()
            });
            
            return json({ 
                url: dataUrl, 
                filename, 
                size: file.size,
                id: uploadRef.key 
            });
        }
        
        return json({ error: 'Storage not configured' }, { status: 500 });
    } catch (error) {
        console.error('Upload error:', error);
        return json({ error: 'Upload failed', details: error.message }, { status: 500 });
    }
}
