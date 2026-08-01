// src/services/signatureService.ts
import { supabase } from '../lib/supabase';
import type { ContractData } from '../utils/documentGenerator';

export interface SignatureRequest {
  token: string;
  contractData: ContractData;
  createdAt: string;
  status: 'pending' | 'signed' | 'cancelled';
  signedAt?: string;
  signerIp?: string;
  signerUserAgent?: string;
  documentHash?: string;
  signedPdfUrl?: string;
  signatureImageBase64?: string;
}

const STORAGE_KEY = 'mirapinos_signature_requests_v1';

function getLocalRequests(): Record<string, SignatureRequest> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalRequests(requests: Record<string, SignatureRequest>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch (err) {
    console.error('Error saving signature requests to localStorage:', err);
  }
}

export const signatureService = {
  /**
   * Crea una nueva solicitud de firma y devuelve el token único y la URL pública.
   */
  async createRequest(contractData: ContractData): Promise<{ token: string; shareUrl: string }> {
    const token = crypto.randomUUID();
    const shareUrl = `${window.location.origin}/firmar/${token}`;

    const newRequest: SignatureRequest = {
      token,
      contractData,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    // 1. Guardar en localStorage para respaldo local rápido
    const localReqs = getLocalRequests();
    localReqs[token] = newRequest;
    saveLocalRequests(localReqs);

    // 2. Intentar guardar en Supabase (si existe la tabla o como registro en documentos/sales)
    try {
      await (supabase as any).from('document_signatures').insert({
        token,
        contract_data: contractData,
        status: 'pending',
        created_at: newRequest.createdAt
      });
    } catch {
      console.warn('Firma registrada localmente (tabla Supabase pendiente de migración o indisponible).');
    }

    return { token, shareUrl };
  },

  /**
   * Obtiene la información de una solicitud de firma mediante su token.
   */
  async getRequestByToken(token: string): Promise<SignatureRequest | null> {
    // 1. Buscar en localStorage
    const localReqs = getLocalRequests();
    if (localReqs[token]) {
      return localReqs[token];
    }

    // 2. Buscar en Supabase
    try {
      const { data, error } = await (supabase as any)
        .from('document_signatures')
        .select('*')
        .eq('token', token)
        .single();

      if (data && !error) {
        return {
          token: data.token,
          contractData: data.contract_data,
          createdAt: data.created_at,
          status: data.status,
          signedAt: data.signed_at,
          signerIp: data.signer_ip,
          signerUserAgent: data.signer_user_agent,
          documentHash: data.document_hash,
          signedPdfUrl: data.signed_pdf_url,
          signatureImageBase64: data.signature_image_base64
        };
      }
    } catch (err) {
      console.error('Error fetching signature request from Supabase:', err);
    }

    return null;
  },

  /**
   * Completa el proceso de firma registrando trazo, IP, User Agent, Hash e imagen.
   */
  async completeSignature(
    token: string,
    signatureImageBase64: string,
    signerIp: string,
    documentHash: string,
    signedPdfUrl?: string
  ): Promise<SignatureRequest> {
    const signedAt = new Date().toISOString();
    const userAgent = navigator.userAgent;

    // Actualizar copia local
    const localReqs = getLocalRequests();
    const req = localReqs[token];

    const updatedRequest: SignatureRequest = {
      ...(req || {
        token,
        contractData: {} as any,
        createdAt: signedAt
      }),
      status: 'signed',
      signedAt,
      signerIp,
      signerUserAgent: userAgent,
      documentHash,
      signatureImageBase64,
      signedPdfUrl
    };

    localReqs[token] = updatedRequest;
    saveLocalRequests(localReqs);

    // Intentar actualizar Supabase
    try {
      await (supabase as any).from('document_signatures').upsert({
        token,
        status: 'signed',
        signed_at: signedAt,
        signer_ip: signerIp,
        signer_user_agent: userAgent,
        document_hash: documentHash,
        signature_image_base64: signatureImageBase64,
        signed_pdf_url: signedPdfUrl
      });
    } catch {
      console.warn('Firma completada en almacenamiento local.');
    }

    return updatedRequest;
  }
};
