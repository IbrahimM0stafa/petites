import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';

import { readApiErrorMessage, readApiFieldErrors } from '../../../core/models/api-error.model';
import { Category } from '../../../core/models/category.model';
import { CategoryService } from '../../../core/services/category.service';
import { ImageUploadService } from '../../../core/services/image-upload.service';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.css'
})
export class ProductFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly imageUploadService = inject(ImageUploadService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  productForm: FormGroup;
  categories: Category[] = [];
  isEditMode = false;
  productId: string | null = null;
  loading = false;
  uploadingMain = false;
  uploadingSecondary: boolean[] = [];
  errorMessage = '';
  fieldErrors: Record<string, string[]> = {};
  private pendingImageDeletions = new Set<string>();
  private pendingMainImageFile: File | null = null;
  private pendingMainImagePreviewUrl: string | null = null;
  private pendingSecondaryImageFiles: Array<File | null> = [];
  private pendingSecondaryImagePreviewUrls: Array<string | null> = [];

  constructor() {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      price: [0, [Validators.required, Validators.min(0.01)]],
      categoryId: [''],
      isAvailable: [true],
      isFeatured: [false],
      mainImage: [''],
      imageUrls: this.fb.array([])
    });
  }

  get imageUrls(): FormArray {
    return this.productForm.get('imageUrls') as FormArray;
  }

  ngOnInit(): void {
    this.loadCategories();

    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.isEditMode = true;
      this.loadProduct(this.productId);
    }
  }

  loadCategories(): void {
    this.categoryService.list(0, 100).subscribe({
      next: (res) => {
        this.categories = res.content;
      },
      error: (err) => {
        this.errorMessage = readApiErrorMessage(err, 'Failed to load categories.');
      }
    });
  }

  loadProduct(id: string): void {
    this.loading = true;
    this.productService.get(id).subscribe({
      next: (product) => {
        this.resetPendingImageState();
        this.productForm.patchValue({
          name: product.name,
          description: product.description || '',
          price: product.price,
          categoryId: product.categoryId || '',
          isAvailable: product.isAvailable,
          isFeatured: product.isFeatured,
          mainImage: product.mainImage || ''
        });

        this.imageUrls.clear();
        this.uploadingSecondary = [];
        if (product.images && product.images.length > 0) {
          product.images.forEach((img) => {
            this.imageUrls.push(this.fb.control(img.imageUrl));
            this.uploadingSecondary.push(false);
            this.pendingSecondaryImageFiles.push(null);
            this.pendingSecondaryImagePreviewUrls.push(null);
          });
        }

        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = readApiErrorMessage(err, 'Failed to load product.');
        this.loading = false;
      }
    });
  }

  onMainImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.errorMessage = '';
      const currentImage = this.productForm.get('mainImage')?.value as string;
      if (currentImage && !this.isLocalPreviewUrl(currentImage)) {
        this.queueImageDeletion(currentImage);
      }

      this.clearMainImageSelection();
      this.pendingMainImageFile = file;
      this.pendingMainImagePreviewUrl = URL.createObjectURL(file);
      this.productForm.patchValue({ mainImage: this.pendingMainImagePreviewUrl });
    }
  }

  removeMainImage(): void {
    const currentImage = this.productForm.get('mainImage')?.value as string;
    if (this.pendingMainImageFile) {
      this.clearMainImageSelection();
    } else if (currentImage && !this.isLocalPreviewUrl(currentImage)) {
      this.queueImageDeletion(currentImage);
    }

    this.productForm.patchValue({ mainImage: '' });
  }

  addSecondaryImageControl(url = ''): void {
    this.imageUrls.push(this.fb.control(url));
    this.uploadingSecondary.push(false);
    this.pendingSecondaryImageFiles.push(null);
    this.pendingSecondaryImagePreviewUrls.push(null);
  }

  removeSecondaryImageControl(index: number): void {
    const currentImage = this.imageUrls.at(index)?.value as string;
    if (this.pendingSecondaryImageFiles[index]) {
      this.clearSecondaryImageSelection(index);
    } else if (currentImage && !this.isLocalPreviewUrl(currentImage)) {
      this.queueImageDeletion(currentImage);
    }

    this.imageUrls.removeAt(index);
    this.uploadingSecondary.splice(index, 1);
    this.pendingSecondaryImageFiles.splice(index, 1);
    this.pendingSecondaryImagePreviewUrls.splice(index, 1);
  }

  onSecondaryImageSelected(event: Event, index: number): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.errorMessage = '';
      const currentImage = this.imageUrls.at(index)?.value as string;
      if (currentImage && !this.isLocalPreviewUrl(currentImage)) {
        this.queueImageDeletion(currentImage);
      }

      this.clearSecondaryImageSelection(index);
      this.pendingSecondaryImageFiles[index] = file;
      this.pendingSecondaryImagePreviewUrls[index] = URL.createObjectURL(file);
      this.imageUrls.at(index).setValue(this.pendingSecondaryImagePreviewUrls[index]);
    }
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.fieldErrors = {};

    const formVal = this.productForm.value;
    let uploadedImageUrls: string[] = [];

    this.resolveImageUploads(formVal).pipe(
      tap((resolved) => {
        uploadedImageUrls = resolved.uploadedImageUrls;
      }),
      switchMap((resolved) => {
        const payload = {
          name: formVal.name,
          description: formVal.description,
          price: formVal.price,
          categoryId: formVal.categoryId || undefined,
          isAvailable: formVal.isAvailable,
          isFeatured: formVal.isFeatured,
          mainImage: resolved.mainImage || '',
          imageUrls: resolved.imageUrls
        };

        return this.isEditMode && this.productId
          ? this.productService.update(this.productId, payload)
          : this.productService.create(payload);
      }),
      switchMap(() => this.cleanupRemovedImages())
    ).subscribe({
      next: () => {
        this.loading = false;
        this.clearPendingImageState();
        this.navigateToList();
      },
      error: (err) => {
        this.cleanupUploadedImages(uploadedImageUrls).subscribe({
          next: () => this.handleError(err),
          error: () => this.handleError(err)
        });
      }
    });
  }

  private resolveImageUploads(formVal: any): Observable<{
    mainImage: string;
    imageUrls: string[];
    uploadedImageUrls: string[];
  }> {
    const uploadedImageUrls: string[] = [];

    const mainImage$ = this.pendingMainImageFile
      ? this.uploadImageDuringSubmit(
          this.pendingMainImageFile,
          () => {
            this.uploadingMain = true;
          },
          () => {
            this.uploadingMain = false;
          },
          uploadedImageUrls
        )
      : of(formVal.mainImage || '');

    const galleryImages$ = this.imageUrls.length > 0
      ? forkJoin(
          this.imageUrls.controls.map((control, index) => {
            const pendingFile = this.pendingSecondaryImageFiles[index];
            return pendingFile
              ? this.uploadImageDuringSubmit(
                  pendingFile,
                  () => {
                    this.uploadingSecondary[index] = true;
                  },
                  () => {
                    this.uploadingSecondary[index] = false;
                  },
                  uploadedImageUrls
                )
              : of((control.value as string) || '');
          })
        ).pipe(
          map((urls) => urls.filter((url): url is string => !!url))
        )
      : of([] as string[]);

    return forkJoin({
      mainImage: mainImage$,
      imageUrls: galleryImages$
    }).pipe(
      map((resolved) => ({
        ...resolved,
        uploadedImageUrls
      }))
    );
  }

  private uploadImageDuringSubmit(
    file: File,
    onStart: () => void,
    onDone: () => void,
    uploadedImageUrls: string[]
  ): Observable<string> {
    onStart();
    return this.imageUploadService.upload(file).pipe(
      tap((url) => uploadedImageUrls.push(url)),
      finalize(onDone)
    );
  }

  private cleanupUploadedImages(imageUrls: string[]): Observable<void> {
    if (imageUrls.length === 0) {
      return of(void 0);
    }

    return forkJoin(
      imageUrls.map((imageUrl) =>
        this.imageUploadService.deleteByUrl(imageUrl).pipe(
          catchError(() => of(void 0))
        )
      )
    ).pipe(
      catchError(() => of(void 0)),
      map(() => void 0)
    );
  }

  private queueImageDeletion(imageUrl: string | null | undefined): void {
    if (imageUrl) {
      this.pendingImageDeletions.add(imageUrl);
    }
  }

  private cleanupRemovedImages(): Observable<void> {
    const imagesToDelete = Array.from(this.pendingImageDeletions);
    this.pendingImageDeletions.clear();

    if (imagesToDelete.length === 0) {
      return of(void 0);
    }

    return forkJoin(
      imagesToDelete.map((imageUrl) =>
        this.imageUploadService.deleteByUrl(imageUrl).pipe(
          catchError(() => of(void 0))
        )
      )
    ).pipe(
      catchError(() => of(void 0)),
      map(() => void 0)
    );
  }

  private navigateToList(): void {
    this.router.navigate(['/products']);
  }

  private handleError(err: unknown): void {
    this.errorMessage = readApiErrorMessage(err, 'An error occurred while saving the product.');
    const parsedFieldErrors = readApiFieldErrors(err);
    if (parsedFieldErrors) {
      this.fieldErrors = parsedFieldErrors;
    }
    this.loading = false;
  }

  private clearMainImageSelection(): void {
    if (this.pendingMainImagePreviewUrl) {
      URL.revokeObjectURL(this.pendingMainImagePreviewUrl);
    }
    this.pendingMainImageFile = null;
    this.pendingMainImagePreviewUrl = null;
  }

  private clearSecondaryImageSelection(index: number): void {
    const previewUrl = this.pendingSecondaryImagePreviewUrls[index];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    this.pendingSecondaryImageFiles[index] = null;
    this.pendingSecondaryImagePreviewUrls[index] = null;
  }

  private clearPendingImageState(): void {
    this.clearMainImageSelection();
    this.pendingSecondaryImageFiles.forEach((_, index) => this.clearSecondaryImageSelection(index));
    this.pendingSecondaryImageFiles = [];
    this.pendingSecondaryImagePreviewUrls = [];
    this.uploadingMain = false;
    this.uploadingSecondary = [];
  }

  private resetPendingImageState(): void {
    this.clearPendingImageState();
    this.pendingImageDeletions.clear();
  }

  private isLocalPreviewUrl(value: string | null | undefined): boolean {
    return !!value && value.startsWith('blob:');
  }
}
