const CORES: Record<string, string> = {
  'a iniciar': 'bg-superficie-2 text-texto-suave',
  'em andamento': 'bg-andamento-suave text-andamento',
  concluído: 'bg-ok-suave text-ok',
  concluida: 'bg-ok-suave text-ok',
  cancelado: 'bg-parado-suave text-parado',
  ativa: 'bg-ok-suave text-ok',
  // Situação da cliente, de "Área clientes".
  fluindo: 'bg-ok-suave text-ok',
  'a iniciar ': 'bg-superficie-2 text-texto-suave',
  atenção: 'bg-andamento-suave text-andamento',
  'em crise': 'bg-parado-suave text-parado',
  finalizado: 'bg-superficie-2 text-texto-suave',
};

export function Etiqueta({ texto }: { texto: string }) {
  if (!texto) return null;
  const cor = CORES[texto.trim().toLowerCase()] ?? 'bg-superficie-2 text-texto-suave';

  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${cor}`}>
      {texto}
    </span>
  );
}
