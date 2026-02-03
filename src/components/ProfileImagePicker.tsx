'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, User, Trash2 } from 'lucide-react';
import CameraCapture from './CameraCapture';
import { haptic } from '@/lib/haptics';

interface ProfileImagePickerProps {
  currentImage?: string | null;
  name: string;
  onImageChange: (imageData: string | null) => void;
  size?: number;
}

export default function ProfileImagePicker({
  currentImage,
  name,
  onImageChange,
  size = 120,
}: ProfileImagePickerProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(currentImage || null);
  const [imgError, setImgError] = useState(false);

  const handleCapture = (imageData: string) => {
    setPreviewImage(imageData);
    setImgError(false);
    onImageChange(imageData);
    setShowCamera(false);
    haptic.success();
  };

  const handleRemove = () => {
    setPreviewImage(null);
    onImageChange(null);
    haptic.light();
  };

  // Generate avatar color from name
  const getAvatarColor = (name: string): string => {
    const colors = [
      'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
      'linear-gradient(135deg, #4ECDC4 0%, #6EE7DE 100%)',
      'linear-gradient(135deg, #45B7D1 0%, #67D4ED 100%)',
      'linear-gradient(135deg, #96CEB4 0%, #B8E4CF 100%)',
      'linear-gradient(135deg, #DDA0DD 0%, #E8C1E8 100%)',
      'linear-gradient(135deg, #F7DC6F 0%, #F9E79F 100%)',
      'linear-gradient(135deg, #BB8FCE 0%, #D2B4DE 100%)',
      'linear-gradient(135deg, #85C1E9 0%, #AED6F1 100%)',
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCamera(true)}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          {previewImage && !imgError ? (
            <img
              src={previewImage}
              alt={name}
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: getAvatarColor(name),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {name ? (
                <span
                  style={{
                    fontSize: size * 0.4,
                    fontWeight: 700,
                    color: 'white',
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  {name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <User size={size * 0.4} color="white" />
              )}
            </div>
          )}

          {/* Camera overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s',
            }}
            className="camera-overlay"
          >
            <Camera size={size * 0.25} color="white" />
          </div>
        </motion.div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="btn"
            style={{
              background: 'var(--color-primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              fontSize: '0.9rem',
            }}
          >
            <Camera size={18} />
            {previewImage ? 'Ändern' : 'Foto aufnehmen'}
          </button>

          {previewImage && (
            <button
              type="button"
              onClick={handleRemove}
              className="btn"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--color-error)',
                padding: '10px',
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>

        <style jsx>{`
          div:hover .camera-overlay {
            opacity: 1 !important;
          }
        `}</style>
      </div>

      {/* Camera modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
          aspectRatio={1}
          maxSize={400}
          showGalleryOption={true}
        />
      )}
    </>
  );
}
