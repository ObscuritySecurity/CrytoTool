
import React from 'react';
import { DBItem, Tag } from './utils/db';

export interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  children: React.ReactNode;
}

// --- App Core Types ---

export interface FileSystemItem extends Omit<DBItem, 'fileData'> {
  url?: string;
  rawBlob?: Blob;
}

export interface LocationItem {
  id: string; name: string; lat: number; lng: number; region: string;
}

export type ViewState = 'dashboard' | 'search' | 'trash' | 'settings' | 'storage' | 'themes' | 'fonts' | 'about' | 'vault';
export type AppTheme = 'dark' | 'light' | 'system';

// --- Theme Types ---

export type ThemeCategory = 'Neon' | 'Dark' | 'Light' | 'Nature' | 'Ocean' | 'Space' | 'Retro' | 'Royal' | 'Sunset' | 'Tech';
export type FontCategory = 'Modern' | 'Tech' | 'Serif' | 'Display' | 'Handwriting' | 'System';

export interface ThemeConfig {
  id: string;
  name: string;
  accent: string;
  bgMain: string;
  bgCard: string;
  bgSurface: string;
  border: string;
  textMain: string;
  textMuted: string;
}

export interface FontConfig {
  id: string;
  name: string;
  family: string;
  category: FontCategory;
}

// --- CRYPTO TYPES ---
export type CryptoAlgorithm = 'AES-GCM' | 'AES-CTR' | 'ChaCha20-Poly1305' | 'XChaCha20-Poly1305' | 'Salsa20-Poly1305';
