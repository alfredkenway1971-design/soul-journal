import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";

const AppLanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  const current = LANGUAGES.find((l) => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full w-12 h-12 p-0 bg-background/80 hover:bg-background/90 ring-2 ring-border/60 shadow-lg overflow-visible transition-transform hover:scale-105">
            <span className="text-3xl text-foreground">{current?.flag || "🌐"}</span>
          </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center gap-3 px-4 py-3 ${language === lang.code ? "bg-primary/10 font-semibold" : ""}`}
          >
               <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background/20">
                 <span className="text-2xl">{lang.flag}</span>
               </div>
             <div className="flex flex-col items-start">
               <span className="text-sm font-medium">{lang.native}</span>
               <span className="text-xs text-muted-foreground">{lang.name}</span>
             </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AppLanguageSwitcher;
