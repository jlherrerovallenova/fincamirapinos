// src/hooks/useDocuments.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const DOCUMENT_CATEGORIES = ['Documentos Olivo', 'Documentos Arce', 'Parcelas', 'Renders-Fotos'];

export interface SystemDocument {
    name: string;
    id: string;
    updated_at: string;
    category: string;
    fullPath: string;
    url?: string;
    metadata?: {
        size: number;
        mimetype: string;
    };
}

export function useDocuments() {
    return useQuery({
        queryKey: ['system_documents'],
        queryFn: async () => {
            // Consultas en paralelo para todas las categorías y la raíz
            const categoryPromises = DOCUMENT_CATEGORIES.map(async (category) => {
                const { data, error } = await supabase.storage.from('documents').list(category);
                if (error) {
                    console.error(`Error listando la carpeta ${category}:`, error);
                    return [];
                }
                if (!data) return [];
                const validFiles = data.filter(f => f.name !== '.emptyFolderPlaceholder' && f.name !== '.emptyFolder' && f.id);
                return validFiles.map(doc => {
                    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(`${category}/${doc.name}`);
                    return {
                        ...doc,
                        category,
                        fullPath: `${category}/${doc.name}`,
                        url: publicUrl
                    };
                });
            });

            const rootPromise = (async () => {
                const { data: rootData, error: rootError } = await supabase.storage.from('documents').list();
                if (rootError || !rootData) return [];
                const rootFiles = rootData.filter(f => f.id && f.name !== '.emptyFolderPlaceholder' && f.name !== '.emptyFolder' && !DOCUMENT_CATEGORIES.includes(f.name));
                return rootFiles.map(doc => {
                    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(doc.name);
                    return {
                        ...doc,
                        category: 'Sin Categorizar',
                        fullPath: doc.name,
                        url: publicUrl
                    };
                });
            })();

            const [categoryResults, rootDocs] = await Promise.all([
                Promise.all(categoryPromises),
                rootPromise
            ]);

            const allDocs: SystemDocument[] = [
                ...categoryResults.flat(),
                ...rootDocs
            ] as unknown as SystemDocument[];

            return allDocs;
        },
        staleTime: 1000 * 60 * 5, // Cache por 5 minutos, evita spameo a la base de datos
        retry: 1
    });
}
