package com.petites.backend.images.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
public class ImageUploadService {
    private final Cloudinary cloudinary;

    public ImageUploadService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    /**
     * Uploads a file to Cloudinary and returns the secure URL.
     */
    public String upload(MultipartFile file) throws IOException {
        Map<String, Object> params = new HashMap<>();
        params.put("resource_type", "image");
        // You can add folder or transformations if needed
        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), params);
        return (String) uploadResult.get("secure_url");
    }

    /**
     * Deletes an image from Cloudinary given its secure URL.
     * Extracts the public ID from the URL and calls the Cloudinary destroy API.
     */
    public void delete(String url) throws IOException {
        String publicId = extractPublicId(url);
        if (publicId != null && !publicId.isBlank()) {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap(
                    "resource_type", "image",
                    "invalidate", true
            ));
        }
    }

    private String extractPublicId(String url) {
        // Expected format: https://res.cloudinary.com/<cloud>/<resource_type>/upload/v<version>/<folder>/<publicId>.<ext>
        int uploadIdx = url.indexOf("/upload/");
        if (uploadIdx == -1) {
            return null;
        }
        String afterUpload = url.substring(uploadIdx + "/upload/".length());
        // Strip version prefix if present (e.g., v1654321/)
        if (afterUpload.startsWith("v")) {
            int slash = afterUpload.indexOf('/');
            if (slash != -1) {
                afterUpload = afterUpload.substring(slash + 1);
            }
        }
        int queryIdx = afterUpload.indexOf('?');
        if (queryIdx != -1) {
            afterUpload = afterUpload.substring(0, queryIdx);
        }
        // Remove file extension
        int dot = afterUpload.lastIndexOf('.');
        if (dot != -1) {
            afterUpload = afterUpload.substring(0, dot);
        }
        return afterUpload;
    }
}
