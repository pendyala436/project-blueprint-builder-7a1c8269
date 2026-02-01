import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, CheckCircle, Clock, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const kycSchema = z.object({
  full_name_as_per_bank: z.string().min(2, "Full name is required").max(100),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  gender: z.string().optional(),
  country_of_residence: z.string().default("India"),
  bank_name: z.string().min(2, "Bank name is required").max(100),
  account_holder_name: z.string().min(2, "Account holder name is required").max(100),
  account_number: z.string().min(9, "Valid account number required").max(18),
  ifsc_code: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format"),
  id_type: z.enum(["aadhaar", "pan", "passport", "voter_id"]),
  id_number: z.string().min(6, "Valid ID number required").max(20),
  consent_given: z.boolean().refine(val => val === true, "You must provide consent"),
});

type KYCFormData = z.infer<typeof kycSchema>;

interface KYCRecord {
  id: string;
  user_id: string;
  full_name_as_per_bank: string;
  date_of_birth: string;
  gender: string | null;
  country_of_residence: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  id_type: string;
  id_number: string;
  document_front_url: string | null;
  document_back_url: string | null;
  selfie_url: string | null;
  verification_status: string;
  rejection_reason: string | null;
  consent_given: boolean;
  created_at: string;
}

export function WomenKYCForm() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingKYC, setExistingKYC] = useState<KYCRecord | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // File upload states
  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const form = useForm<KYCFormData>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      full_name_as_per_bank: "",
      date_of_birth: "",
      gender: "",
      country_of_residence: "India",
      bank_name: "",
      account_holder_name: "",
      account_number: "",
      ifsc_code: "",
      id_type: "aadhaar",
      id_number: "",
      consent_given: false,
    },
  });

  useEffect(() => {
    loadExistingKYC();
  }, []);

  const loadExistingKYC = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      const { data, error } = await supabase
        .from('women_kyc')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading KYC:', error);
        return;
      }

      if (data) {
        setExistingKYC(data as KYCRecord);
        // Pre-fill form with existing data
        form.reset({
          full_name_as_per_bank: data.full_name_as_per_bank,
          date_of_birth: data.date_of_birth,
          gender: data.gender || "",
          country_of_residence: data.country_of_residence,
          bank_name: data.bank_name,
          account_holder_name: data.account_holder_name,
          account_number: data.account_number,
          ifsc_code: data.ifsc_code,
          id_type: data.id_type as any,
          id_number: data.id_number,
          consent_given: data.consent_given,
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!userId) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${folder}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('kyc-documents')
      .upload(fileName, file, { upsert: true });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const onSubmit = async (data: KYCFormData) => {
    if (!userId) {
      toast.error("Please log in to submit KYC");
      return;
    }

    setSubmitting(true);
    setUploadingFiles(true);

    try {
      // Upload documents if provided
      let documentFrontUrl = existingKYC?.document_front_url || null;
      let documentBackUrl = existingKYC?.document_back_url || null;
      let selfieUrl = existingKYC?.selfie_url || null;

      if (documentFront) {
        documentFrontUrl = await uploadFile(documentFront, 'id-front');
      }
      if (documentBack) {
        documentBackUrl = await uploadFile(documentBack, 'id-back');
      }
      if (selfie) {
        selfieUrl = await uploadFile(selfie, 'selfie');
      }

      setUploadingFiles(false);

      const kycData = {
        user_id: userId,
        full_name_as_per_bank: data.full_name_as_per_bank.trim(),
        date_of_birth: data.date_of_birth,
        gender: data.gender || null,
        country_of_residence: data.country_of_residence,
        bank_name: data.bank_name.trim(),
        account_holder_name: data.account_holder_name.trim(),
        account_number: data.account_number.trim(),
        ifsc_code: data.ifsc_code.toUpperCase().trim(),
        id_type: data.id_type,
        id_number: data.id_number.trim(),
        document_front_url: documentFrontUrl,
        document_back_url: documentBackUrl,
        selfie_url: selfieUrl,
        consent_given: data.consent_given,
        consent_timestamp: new Date().toISOString(),
        verification_status: 'pending',
      };

      if (existingKYC) {
        // Update existing
        const { error } = await supabase
          .from('women_kyc')
          .update(kycData)
          .eq('user_id', userId);

        if (error) throw error;
        toast.success("KYC updated successfully!");
      } else {
        // Insert new
        const { error } = await supabase
          .from('women_kyc')
          .insert(kycData);

        if (error) throw error;
        toast.success("KYC submitted successfully!");
      }

      loadExistingKYC();
    } catch (error: any) {
      console.error('KYC submission error:', error);
      toast.error(error.message || "Failed to submit KYC");
    } finally {
      setSubmitting(false);
      setUploadingFiles(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>;
      case 'under_review':
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" /> Under Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // If KYC is approved, show read-only status
  if (existingKYC?.verification_status === 'approved') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            KYC Verification {getStatusBadge('approved')}
          </CardTitle>
          <CardDescription>Your KYC has been verified. You can receive payouts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Full Name</Label>
              <p className="font-medium">{existingKYC.full_name_as_per_bank}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Bank</Label>
              <p className="font-medium">{existingKYC.bank_name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Account Number</Label>
              <p className="font-medium">****{existingKYC.account_number.slice(-4)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">IFSC</Label>
              <p className="font-medium">{existingKYC.ifsc_code}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isEditable = !existingKYC || existingKYC.verification_status === 'pending' || existingKYC.verification_status === 'rejected';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          KYC Verification
          {existingKYC && getStatusBadge(existingKYC.verification_status)}
        </CardTitle>
        <CardDescription>
          Complete your KYC to receive payouts. All information is stored securely.
        </CardDescription>
        {existingKYC?.verification_status === 'rejected' && existingKYC.rejection_reason && (
          <div className="flex items-start gap-2 p-3 mt-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Rejection Reason:</p>
              <p className="text-sm text-red-600 dark:text-red-300">{existingKYC.rejection_reason}</p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Basic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="full_name_as_per_bank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name (as per bank records) *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter full name" disabled={!isEditable} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" disabled={!isEditable} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!isEditable}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country_of_residence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country of Residence *</FormLabel>
                      <FormControl>
                        <Input {...field} disabled value="India" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Bank Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., State Bank of India" disabled={!isEditable} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="account_holder_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Holder Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Name as on bank account" disabled={!isEditable} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter account number" disabled={!isEditable} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ifsc_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IFSC Code *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., SBIN0001234" 
                          disabled={!isEditable}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* KYC Documents */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">KYC Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="id_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!isEditable}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ID type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                          <SelectItem value="pan">PAN Card</SelectItem>
                          <SelectItem value="passport">Passport</SelectItem>
                          <SelectItem value="voter_id">Voter ID</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="id_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Number *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter ID number" disabled={!isEditable} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Document Uploads */}
              {isEditable && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Document Front</Label>
                    <div className="mt-1">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">
                          {documentFront?.name || existingKYC?.document_front_url ? 'Replace' : 'Upload front'}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf"
                          onChange={(e) => setDocumentFront(e.target.files?.[0] || null)}
                        />
                      </label>
                      {(documentFront || existingKYC?.document_front_url) && (
                        <p className="text-xs text-green-600 mt-1">✓ Uploaded</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Document Back</Label>
                    <div className="mt-1">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">
                          {documentBack?.name || existingKYC?.document_back_url ? 'Replace' : 'Upload back'}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf"
                          onChange={(e) => setDocumentBack(e.target.files?.[0] || null)}
                        />
                      </label>
                      {(documentBack || existingKYC?.document_back_url) && (
                        <p className="text-xs text-green-600 mt-1">✓ Uploaded</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Selfie / Liveness</Label>
                    <div className="mt-1">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">
                          {selfie?.name || existingKYC?.selfie_url ? 'Replace' : 'Upload selfie'}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => setSelfie(e.target.files?.[0] || null)}
                        />
                      </label>
                      {(selfie || existingKYC?.selfie_url) && (
                        <p className="text-xs text-green-600 mt-1">✓ Uploaded</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Consent */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Compliance</h3>
              <FormField
                control={form.control}
                name="consent_given"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!isEditable}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">
                        I confirm that the information provided is accurate and I consent to its use for verification and payout purposes. *
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {isEditable && (
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadingFiles ? 'Uploading documents...' : 'Submitting...'}
                  </>
                ) : existingKYC ? (
                  'Update KYC'
                ) : (
                  'Submit KYC'
                )}
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
