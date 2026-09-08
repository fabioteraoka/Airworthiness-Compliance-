import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  ShieldAlert, 
  Loader2, 
  CheckCircle2, 
  Info,
  Calendar,
  FileText
} from 'lucide-react';
import { ComplianceRequirement } from '../types';

interface DeleteAdConfirmationModalProps {
  requirement: ComplianceRequirement;
  onClose: () => void;
  onDeleted: (message: string) => void;
}

export default function DeleteAdConfirmationModal({
  requirement,
  onClose,
  onDeleted
}: DeleteAdConfirmationModalProps) {
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayAdNumber = requirement.sourceNumber && requirement.sourceNumber !== 'NOT_EXTRACTED' && requirement.sourceNumber !== 'UNKNOWN_AD'
    ? requirement.sourceNumber
    : (requirement.sourceDocument?.fileName || 'Diretriz / Documento não identificado');

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/requirements/${requirement.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao excluir Diretriz de Aeronavegabilidade');
      }

      onDeleted(data.message || 'Diretriz de Aeronavegabilidade excluída com sucesso. Você pode reenviar o documento.');
    } catch (err: any) {
      console.error('Deletion error:', err);
      setErrorMessage(err.message || 'Ocorreu um erro ao excluir a AD.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        {/* Header (Sticky) */}
        <div className="bg-rose-950/60 border-b border-rose-900/60 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 text-rose-400">
            <div className="p-2.5 bg-rose-500/20 rounded-xl border border-rose-500/30">
              <Trash2 className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 id="delete-modal-title" className="text-base font-bold text-white tracking-wide">
                Excluir Diretriz de Aeronavegabilidade
              </h2>
              <p className="text-xs text-rose-300/80 font-mono">
                Confirmação de Exclusão Controlada CAMO
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs grow">
          {/* AD Summary Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-slate-400 text-xs font-sans font-bold">Identificação:</span>
              <span className="text-sm font-black text-rose-400 font-mono bg-rose-500/10 px-3 py-1 rounded border border-rose-500/20">
                {displayAdNumber}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-sans">Autoridade:</span>
                <span className="text-white font-semibold">{requirement.issuingAuthority}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">Revisão:</span>
                <span className="text-white font-semibold">{requirement.revision || 'Original'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">Data Efetiva:</span>
                <span className="text-white font-semibold">{requirement.effectiveDate || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">Emergencial:</span>
                <span className={requirement.emergencyAd ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                  {requirement.emergencyAd ? 'SIM (Ação Imediata)' : 'NÃO'}
                </span>
              </div>
            </div>

            {requirement.title && (
              <div className="border-t border-slate-800 pt-2.5 text-xs">
                <span className="text-slate-400 block font-sans">Título / Assunto:</span>
                <p className="text-slate-200 font-sans line-clamp-2 mt-0.5">{requirement.title}</p>
              </div>
            )}
          </div>

          {/* Impact Warning */}
          <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center space-x-2 text-rose-300 font-bold uppercase tracking-wider text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Atenção: Ação Irreversível</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs">
              Todos os dados e relatórios gerados exclusivamente a partir desta análise serão excluídos:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 pl-1 text-xs">
              <li>Matriz de aplicabilidade calculada para a frota</li>
              <li>Perguntas e respostas de configuração técnica</li>
              <li>Documento FAPT gerado no sistema</li>
              <li>Evidências vinculadas a este registro</li>
            </ul>
            <div className="pt-2 border-t border-rose-500/20 flex items-center space-x-2 text-emerald-400 text-xs">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                O cadastro mestre de aeronaves, motores e componentes permanece <strong>100% preservado</strong>.
              </span>
            </div>
          </div>

          {/* Reason for Deletion */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 font-sans">
              Motivo da Exclusão <span className="text-slate-500 font-normal">(Opcional para log de auditoria)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Reenvio de documento, correção, teste..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Error display */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/40 rounded-lg text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions (Direct, prominent Delete Button) */}
        <div className="bg-slate-950 border-t border-slate-800 px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            id="confirm-delete-ad-button"
            className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold font-mono transition uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Excluindo AD...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Confirmar e Excluir AD</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
