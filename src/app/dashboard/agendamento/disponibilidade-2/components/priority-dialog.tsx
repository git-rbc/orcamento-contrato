"use client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createAvailabilityPriority } from "../utils/actions";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

type PriorityDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  availabilityId: string;
};

export function PriorityDialog({
  open,
  onClose,
  onCreate,
  availabilityId,
}: PriorityDialogProps) {
  const formSchema = z.object({
    comment: z.string(),
  });
  type formSchemaType = z.infer<typeof formSchema>;

  const form = useForm<formSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: "",
    }
  });

  const onSubmit = async ({ comment }: formSchemaType) => {
    const supabase = createClient();
    const user = await supabase.auth.getUser();

    const { error } = await createAvailabilityPriority({ availabilityId, userId: user.data.user.id, comment });

    if (!error) {
      form.reset();
      toast.success("Reserva efetuada com sucesso!");
      onClose();
      onCreate();
      return;
    }
    
    toast.error(error.message);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Criar Reserva
          </DialogTitle>
          <DialogDescription>
            Crie uma nova reserva para ter prioridade de agendemento
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="comment"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Comentário</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Insira um comentário..." {...field}/>
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Reservar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}