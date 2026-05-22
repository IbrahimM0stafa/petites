import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';

import { readApiErrorMessage, readApiFieldErrors } from '../../../core/models/api-error.model';
import { CategoryService } from '../../../core/services/category.service';
import { ImageUploadService } from '../../../core/services/image-upload.service';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.css'
})
export class CategoryFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly imageUploadService = inject(ImageUploadService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  categoryForm: FormGroup;
  isEditMode = false;
  categoryId: string | null = null;
  loading = false;
  uploading = false;
  errorMessage = '';
  fieldErrors: Record<string, string[]> = {};
  private pendingImageFile: File | null = null;
  private pendingImagePreviewUrl: string | null = null;
  private queuedDeletedImageUrl: string | null = null;

  constructor() {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      imageUrl: [''],
      sortOrder: [0, [Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.categoryId = this.route.snapshot.paramMap.get('id');
    if (this.categoryId) {
      this.isEditMode = true;
      this.loadCategory(this.categoryId);
    }
  }

  loadCategory(id: string): void {
    this.loading = true;
    this.categoryService.get(id).subscribe({
      next: (category) => {
        this.resetImageState();
        this.categoryForm.patchValue({
          name: category.name,
          imageUrl: category.imageUrl || '',
          sortOrder: category.sortOrder ?? 0
        });
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = readApiErrorMessage(err, 'Failed to load category.');
        this.loading = false;
      }
    });
  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.errorMessage = '';
      const currentImage = this.categoryForm.get('imageUrl')?.value as string;
      if (currentImage && !this.isLocalPreviewUrl(currentImage)) {
        this.queuedDeletedImageUrl = currentImage;
      }

      this.clearImageSelection();
      this.pendingImageFile = file;
      this.pendingImagePreviewUrl = URL.createObjectURL(file);
      this.categoryForm.patchValue({ imageUrl: this.pendingImagePreviewUrl });
    }
  }

  removeImage(): void {
    const currentImage = this.categoryForm.get('imageUrl')?.value as string;
    if (this.pendingImageFile) {
      this.clearImageSelection();
    } else if (currentImage && !this.isLocalPreviewUrl(currentImage)) {
      this.queuedDeletedImageUrl = currentImage;
    }

    this.categoryForm.patchValue({ imageUrl: '' });
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.fieldErrors = {};

    const reqData = this.categoryForm.value;
    let uploadedImageUrl = '';

    this.resolveImageUrl(reqData.imageUrl).pipe(
      tap((url) => {
        uploadedImageUrl = url;
      }),
      switchMap((imageUrl) => {
        const payload = {
          name: reqData.name,
          imageUrl,
          sortOrder: reqData.sortOrder
        };

        return this.isEditMode && this.categoryId
          ? this.categoryService.update(this.categoryId, payload)
          : this.categoryService.create(payload);
      })
    ).subscribe({
      next: () => this.cleanupQueuedDeletion().subscribe({
        next: () => {
          this.loading = false;
          this.clearImageSelection();
          this.navigateToList();
        },
        error: () => {
          this.loading = false;
          this.clearImageSelection();
          this.navigateToList();
        }
      }),
      error: (err) => {
        this.cleanupUploadedImage(uploadedImageUrl).subscribe({
          next: () => this.handleError(err),
          error: () => this.handleError(err)
        });
      }
    });
  }

  private resolveImageUrl(currentImageUrl: string): Observable<string> {
    if (!this.pendingImageFile) {
      return of(currentImageUrl || '');
    }

    this.uploading = true;
    return this.imageUploadService.upload(this.pendingImageFile).pipe(
      finalize(() => {
        this.uploading = false;
      })
    );
  }

  private cleanupUploadedImage(imageUrl: string): Observable<void> {
    if (!imageUrl) {
      return of(void 0);
    }

    return this.imageUploadService.deleteByUrl(imageUrl).pipe(
      catchError(() => of(void 0)),
      map(() => void 0)
    );
  }

  private cleanupQueuedDeletion(): Observable<void> {
    if (!this.queuedDeletedImageUrl) {
      return of(void 0);
    }

    const imageUrl = this.queuedDeletedImageUrl;
    this.queuedDeletedImageUrl = null;

    return this.imageUploadService.deleteByUrl(imageUrl).pipe(
      catchError(() => of(void 0)),
      map(() => void 0)
    );
  }

  private navigateToList(): void {
    this.router.navigate(['/categories']);
  }

  private handleError(err: unknown): void {
    this.errorMessage = readApiErrorMessage(err, 'An error occurred while saving the category.');
    const parsedFieldErrors = readApiFieldErrors(err);
    if (parsedFieldErrors) {
      this.fieldErrors = parsedFieldErrors;
    }
    this.loading = false;
  }

  private clearImageSelection(): void {
    if (this.pendingImagePreviewUrl) {
      URL.revokeObjectURL(this.pendingImagePreviewUrl);
    }
    this.pendingImageFile = null;
    this.pendingImagePreviewUrl = null;
  }

  private resetImageState(): void {
    this.clearImageSelection();
    this.queuedDeletedImageUrl = null;
    this.uploading = false;
  }

  private isLocalPreviewUrl(value: string | null | undefined): boolean {
    return !!value && value.startsWith('blob:');
  }
}
