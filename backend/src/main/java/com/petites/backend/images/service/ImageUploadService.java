package com.petites.backend.images.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Service
public class ImageUploadService {

    public static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024L; // 10 MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif"
    );

    private final Cloudinary cloudinary;

    public ImageUploadService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    /**
     * Uploads a file to Cloudinary and returns the secure URL.
     * Validates file size, MIME content type, and passes bytes to Cloudinary uploader.
     */
    public String upload(MultipartFile file) throws IOException {
        validateFile(file);

        Map<String, Object> params = new HashMap<>();
        params.put("resource_type", "image");

        Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(), params);
        return (String) uploadResult.get("secure_url");
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Upload file cannot be null or empty");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds maximum allowed limit of 10MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase().trim())) {
            throw new IllegalArgumentException("Invalid file type: only JPEG, PNG, WEBP, and GIF images are allowed");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null) {
            String lowerName = originalFilename.toLowerCase();
            boolean validExtension = ALLOWED_EXTENSIONS.stream().anyMatch(lowerName::endsWith);
            if (!validExtension) {
                throw new IllegalArgumentException("Invalid file extension: must be .jpg, .jpeg, .png, .webp, or .gif");
            }
        }
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
        int dotIdx = afterUpload.lastIndexOf('.');
        if (dotIdx != -1) {
            afterUpload = afterUpload.substring(0, dotIdx);
        }
        return afterUpload;
    }
}
