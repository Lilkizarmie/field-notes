export const COLORS = {
  primary: '#4F46E5', // Indigo 600
  secondary: '#10B981', // Emerald 500
  background: '#F9FAFB', // Gray 50
  surface: '#FFFFFF',
  text: '#1F2937', // Gray 800
  textSecondary: '#6B7280', // Gray 500
  border: '#E5E7EB', // Gray 200
  error: '#EF4444', // Red 500
  success: '#10B981',
  warning: '#F59E0B',
};

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
};

export const FONTS = {
  regular: 'System',
  bold: 'System', // In a real app we might load custom fonts
  // We can add font weights if needed
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
};
