import { Theme } from '@mui/material';
import { StatusIndicator } from '../../types';

export function getStatusColor(theme: Theme, status?: StatusIndicator | null): string {
  switch (status) {
    case 'error':
      return theme.palette.error.main;
    case 'warning':
      return theme.palette.warning.main;
    case 'ok':
      return theme.palette.success.main;
    default:
      return theme.palette.divider;
  }
}

export function getStatusBackground(theme: Theme, status?: StatusIndicator | null): string {
  switch (status) {
    case 'error':
      return theme.palette.error.main + '10';
    case 'warning':
      return theme.palette.warning.main + '10';
    case 'ok':
      return theme.palette.success.main + '10';
    default:
      return 'transparent';
  }
}
