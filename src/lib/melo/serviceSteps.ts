export const SERVICE_STEPS: Record<string, string[]> = {
  filming: ['Roteiro', 'Captação', 'Edição', 'Entrega'],
  design: ['Referências', 'Criação', 'Entrega'],
  web: ['Figma', 'Desenvolvimento', 'Responsividade', 'Entrega'],
  photo: ['Planejamento', 'Sessão', 'Seleção', 'Entrega'],
  other: ['Início', 'Desenvolvimento', 'Entrega'],
};

export function getSteps(type: string): string[] {
  return SERVICE_STEPS[type] ?? SERVICE_STEPS.other;
}

export function stepToProgress(step: number, type: string): number {
  const steps = getSteps(type);
  if (steps.length <= 1) return step > 0 ? 100 : 0;
  return Math.round((step / (steps.length - 1)) * 100);
}

export function progressToStep(progress: number, type: string): number {
  const steps = getSteps(type);
  return Math.min(Math.round((progress / 100) * (steps.length - 1)), steps.length - 1);
}
