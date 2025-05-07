import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCRM } from '@/context/hooks'; // Assuming addRemark will be added to context
import { useToast } from "@/hooks/use-toast";

interface AddRemarkFormProps {
    entityType: 'lead' | 'customer';
    entityId: string | number;
    onRemarkAdded: () => void; // Callback after successful addition
    onCancel: () => void; // Callback to close the form/dialog
}

const formSchema = z.object({
    remarkText: z.string().min(1, { message: "Remark cannot be empty." }).max(1000, { message: "Remark too long." }),
});

type FormValues = z.infer<typeof formSchema>;

export function AddRemarkForm({ entityType, entityId, onRemarkAdded, onCancel }: AddRemarkFormProps) {
    const { addRemark } = useCRM(); // Get addRemark from context
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            remarkText: "",
        },
    });

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        try {
            await addRemark(entityType, entityId, data.remarkText);
            toast({ title: "Remark Added", description: "The remark has been saved." });
            form.reset();
            onRemarkAdded(); // Call the success callback
        } catch (error) {
            console.error("Failed to add remark:", error);
            toast({
                title: "Error",
                description: "Could not save the remark. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="remarkText"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Remark</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder={`Add a note about this ${entityType}...`}
                                    rows={4}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end space-x-2">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save Remark"}
                    </Button>
                </div>
            </form>
        </Form>
    );
} 