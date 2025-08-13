'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { 
  Upload, 
  X, 
  Star, 
  Camera, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { InteractiveRatingStars } from './rating-stars';
import { cn } from '@/lib/utils';

// Validation schema
const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5, 'Rating must be between 1 and 5'),
  title: z.string().optional(),
  content: z.string().min(10, 'Review must be at least 10 characters long').max(2000, 'Review must be less than 2000 characters'),
  photos: z.array(z.instanceof(File)).max(5, 'Maximum 5 photos allowed').optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  targetType: 'restaurant' | 'menu_item';
  targetId: string;
  targetName: string;
  orderId?: string; // For verified reviews
  isVerifiedPurchase?: boolean;
  onSubmit: (data: ReviewFormData & { photos?: File[] }) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  defaultRating?: number;
}

interface PhotoPreview {
  file: File;
  url: string;
  id: string;
}

export default function ReviewForm({
  targetType,
  targetId,
  targetName,
  orderId,
  isVerifiedPurchase = false,
  onSubmit,
  onCancel,
  className,
  defaultRating = 0,
}: ReviewFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [photoPrews, setPhotoPreviews] = useState<PhotoPreview[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: defaultRating,
      title: '',
      content: '',
      photos: [],
    },
  });

  const { watch, setValue, getValues } = form;
  const currentRating = watch('rating');
  const currentContent = watch('content');

  // Photo upload handling
  const handleFileUpload = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== fileArray.length) {
      setSubmitError('Some files were skipped. Only images under 10MB are allowed.');
    }

    const currentPhotos = getValues('photos') || [];
    const totalPhotos = currentPhotos.length + validFiles.length;

    if (totalPhotos > 5) {
      setSubmitError('Maximum 5 photos allowed');
      return;
    }

    const newPreviews: PhotoPreview[] = validFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
    }));

    setPhotoPreviews(prev => [...prev, ...newPreviews]);
    setValue('photos', [...currentPhotos, ...validFiles]);
    setSubmitError(null);
  }, [setValue, getValues]);

  const removePhoto = useCallback((photoId: string) => {
    setPhotoPreviews(prev => {
      const photoToRemove = prev.find(p => p.id === photoId);
      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.url);
      }
      return prev.filter(p => p.id !== photoId);
    });

    const currentPhotos = getValues('photos') || [];
    const photoIndex = photoPrews.findIndex(p => p.id === photoId);
    if (photoIndex >= 0) {
      const newPhotos = currentPhotos.filter((_, index) => index !== photoIndex);
      setValue('photos', newPhotos);
    }
  }, [setValue, getValues, photoPrews]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  // Form submission
  const handleSubmit = async (data: ReviewFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        ...data,
        photos: photoPrews.map(p => p.file),
      });
      setSubmitSuccess(true);
      
      // Clean up photo URLs
      photoPrews.forEach(photo => URL.revokeObjectURL(photo.url));
      
      // Reset form after successful submission
      form.reset();
      setPhotoPreviews([]);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rating labels
  const getRatingLabel = (rating: number) => {
    const labels = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent',
    };
    return labels[rating as keyof typeof labels] || '';
  };

  if (submitSuccess) {
    return (
      <Card className={cn('w-full max-w-2xl mx-auto', className)}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Review Submitted!
              </h3>
              <p className="text-gray-600 mt-2">
                Thank you for your feedback. Your review will be visible once approved.
              </p>
            </div>
            {onCancel && (
              <Button onClick={onCancel} variant="outline">
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Write a Review
        </CardTitle>
        <p className="text-sm text-gray-600">
          Share your experience with {targetName}
          {isVerifiedPurchase && (
            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              Verified Purchase
            </span>
          )}
        </p>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Rating */}
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Rating *</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <InteractiveRatingStars
                        rating={field.value}
                        onRatingChange={field.onChange}
                        size="lg"
                      />
                      {currentRating > 0 && (
                        <p className="text-sm text-gray-600">
                          {currentRating} star{currentRating !== 1 ? 's' : ''} - {getRatingLabel(currentRating)}
                        </p>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Review Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Review Title (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Summarize your experience..."
                      {...field}
                      maxLength={100}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Review Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Review *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell others about your experience..."
                      className="min-h-32 resize-none"
                      maxLength={2000}
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Minimum 10 characters</span>
                    <span>{currentContent?.length || 0}/2000</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo Upload */}
            <div className="space-y-4">
              <Label>Add Photos (Optional)</Label>
              
              {/* Photo Previews */}
              {photoPrews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photoPrews.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={photo.url}
                          alt="Review photo"
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(photo.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Area */}
              {photoPrews.length < 5 && (
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                    dragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('photo-upload')?.click()}
                >
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Add photos to your review
                    </p>
                    <p className="text-xs text-gray-500">
                      Drag and drop or click to upload (max 5 photos, 10MB each)
                    </p>
                  </div>
                  <input
                    id="photo-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  />
                </div>
              )}
            </div>

            {/* Error Display */}
            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-6 border-t">
              <div className="text-xs text-gray-500">
                * Required fields
              </div>
              
              <div className="flex items-center gap-3">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                )}
                
                <Button
                  type="submit"
                  disabled={isSubmitting || !currentRating}
                  className="min-w-32"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Quick review form for inline use
interface QuickReviewFormProps {
  targetType: 'restaurant' | 'menu_item';
  targetId: string;
  onSubmit: (rating: number, content: string) => Promise<void>;
  className?: string;
}

export function QuickReviewForm({ 
  targetType, 
  targetId, 
  onSubmit, 
  className 
}: QuickReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || content.length < 10) return;

    setIsSubmitting(true);
    try {
      await onSubmit(rating, content);
      setRating(0);
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <Label>Rate your experience</Label>
        <InteractiveRatingStars
          rating={rating}
          onRatingChange={setRating}
          size="md"
        />
      </div>

      <div className="space-y-2">
        <Label>Quick review</Label>
        <Textarea
          placeholder="Share your thoughts..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-20 resize-none"
          maxLength={500}
        />
        <div className="text-xs text-gray-500 text-right">
          {content.length}/500
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || rating === 0 || content.length < 10}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Review'
        )}
      </Button>
    </form>
  );
}