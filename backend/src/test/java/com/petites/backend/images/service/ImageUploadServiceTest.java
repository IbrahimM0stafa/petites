package com.petites.backend.images.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImageUploadServiceTest {

    @Mock
    private Cloudinary cloudinary;

    @Mock
    private Uploader uploader;

    @InjectMocks
    private ImageUploadService imageUploadService;

    @BeforeEach
    void setUp() {
        Mockito.lenient().when(cloudinary.uploader()).thenReturn(uploader);
    }

    @Test
    @DisplayName("PERF-03: Rejects empty or null multipart file")
    void testUpload_EmptyFile_ThrowsException() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "test.png", "image/png", new byte[0]);
        Assertions.assertThrows(IllegalArgumentException.class, () -> imageUploadService.upload(emptyFile));
        Assertions.assertThrows(IllegalArgumentException.class, () -> imageUploadService.upload(null));
    }

    @Test
    @DisplayName("PERF-03: Rejects files exceeding 10MB limit")
    void testUpload_OversizedFile_ThrowsException() {
        byte[] largeBytes = new byte[11 * 1024 * 1024]; // 11 MB
        MockMultipartFile largeFile = new MockMultipartFile("file", "large.jpg", "image/jpeg", largeBytes);
        Assertions.assertThrows(IllegalArgumentException.class, () -> imageUploadService.upload(largeFile));
    }

    @Test
    @DisplayName("PERF-03: Rejects invalid MIME content type")
    void testUpload_InvalidMimeType_ThrowsException() {
        MockMultipartFile pdfFile = new MockMultipartFile("file", "document.pdf", "application/pdf", "data".getBytes());
        Assertions.assertThrows(IllegalArgumentException.class, () -> imageUploadService.upload(pdfFile));
    }

    @Test
    @DisplayName("PERF-03: Rejects invalid file extension even if MIME is spoofed")
    void testUpload_InvalidExtension_ThrowsException() {
        MockMultipartFile exeFile = new MockMultipartFile("file", "script.exe", "image/png", "data".getBytes());
        Assertions.assertThrows(IllegalArgumentException.class, () -> imageUploadService.upload(exeFile));
    }

    @Test
    @DisplayName("PERF-03: Successfully uploads valid image bytes to Cloudinary")
    void testUpload_ValidImage_Success() throws IOException {
        MockMultipartFile validFile = new MockMultipartFile("file", "photo.webp", "image/webp",
                "image-content".getBytes());
        when(uploader.upload(any(byte[].class), anyMap()))
                .thenReturn(Map.of("secure_url",
                        "https://res.cloudinary.com/petites/image/upload/v1234/products/photo.webp"));

        String url = imageUploadService.upload(validFile);
        Assertions.assertEquals("https://res.cloudinary.com/petites/image/upload/v1234/products/photo.webp", url);
    }
}
