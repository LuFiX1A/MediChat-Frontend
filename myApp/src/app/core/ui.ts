export const badgeClass = (value: string): string => {
  switch (value) {
    case 'Confirmada':
    case 'Activo':
    case 'Bajo':
    case 'Finalizada':
    case 'Completada':
      return 'ht-badge--success';
    case 'Pendiente':
    case 'En seguimiento':
    case 'Medio':
    case 'Seguimiento':
    case 'warning':
      return 'ht-badge--warning';
    case 'Cancelada':
    case 'Alto':
    case 'Inactivo':
    case 'critical':
      return 'ht-badge--danger';
    case 'Activa':
    case 'info':
      return 'ht-badge--info';
    default:
      return 'ht-badge--neutral';
  }
};

export const severityLabel = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'Crítico';
    case 'warning':
      return 'Advertencia';
    default:
      return 'Informativo';
  }
};

export const severityDotClass = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'dot-danger';
    case 'warning':
      return 'dot-warning';
    default:
      return 'dot-info';
  }
};
