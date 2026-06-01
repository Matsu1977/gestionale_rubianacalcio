import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function PlaceholderPage({ title, description, icon: Icon }: PlaceholderPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="p-4 rounded-2xl bg-primary/10 mb-4">
            <Icon className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold">Sezione {title}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Questa sezione sarà disponibile dopo la configurazione del database.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
