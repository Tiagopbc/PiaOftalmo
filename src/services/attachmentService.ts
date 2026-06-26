import { supabase } from '../utils/supabaseClient';
import { PatientAttachment } from '../types';

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

export const attachmentService = {
  async getPatientAttachments(patientId: string): Promise<PatientAttachment[]> {
    const { data, error } = await supabase
      .from('patient_attachments')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching attachments:', error);
      throw error;
    }
    return data || [];
  },

  async uploadAttachment(
    patientId: string,
    shopId: string,
    file: File,
    isConfidential: boolean
  ): Promise<PatientAttachment> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${patientId}-${Date.now()}.${fileExt}`;
    const storagePath = `attachments/${patientId}/${fileName}`;

    // 1. Fazer o upload para o Storage
    const { error: uploadError } = await supabase.storage
      .from('patient-documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      throw uploadError;
    }

    // 2. Obter o usuário logado
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    // Garante que o anexo seja salvo com o UUID real da filial.
    let validShopId = shopId;
    if (!validShopId || validShopId === 'all' || !isUuid(validShopId)) {
      const { data: accessData } = await supabase
        .from('user_shop_access')
        .select('shop_id')
        .eq('profile_id', userData.user.id)
        .limit(1);
      
      if (accessData && accessData.length > 0) {
        validShopId = accessData[0].shop_id;
      } else {
        throw new Error('Não foi possível identificar a filial para salvar o anexo.');
      }
    }

    // 3. Salvar os metadados na tabela patient_attachments
    const { data: attachmentData, error: dbError } = await supabase
      .from('patient_attachments')
      .insert([
        {
          patient_id: patientId,
          shop_id: validShopId,
          uploader_id: userData.user.id,
          name: file.name,
          storage_path: storagePath,
          file_type: file.type || fileExt,
          size_bytes: file.size,
          is_confidential: isConfidential
        }
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Error saving attachment metadata:', dbError);
      throw dbError;
    }

    return attachmentData;
  },

  async getSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('patient-documents')
      .createSignedUrl(storagePath, 60); // 60 segundos para expirar

    if (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }

    return data.signedUrl;
  },

  async deleteAttachment(id: string, storagePath: string): Promise<void> {
    // 1. Deletar do Storage primeiro
    const { error: storageError } = await supabase.storage
      .from('patient-documents')
      .remove([storagePath]);

    if (storageError) {
      console.error('Error removing file from storage:', storageError);
      throw storageError;
    }

    // 2. Deletar metadados
    const { error: dbError } = await supabase
      .from('patient_attachments')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Error deleting attachment metadata:', dbError);
      throw dbError;
    }
  }
};
