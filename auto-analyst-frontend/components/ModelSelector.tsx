// NOT USED
'use client'

import { useState, useEffect } from 'react'
import { MODEL_TIERS } from '@/lib/model-tiers'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'

interface ModelSelectorProps {
  onModelSelect: (modelName: string) => void
  initialModel?: string
}

export default function ModelSelector({ onModelSelect, initialModel }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState(initialModel || "gpt-3.5-turbo")

  useEffect(() => {
    if (initialModel) {
      setSelectedModel(initialModel)
    }
  }, [initialModel])

  // Get model display name and credits
  const getModelInfo = (modelName: string) => {
    for (const [tierId, tierInfo] of Object.entries(MODEL_TIERS)) {
      if (tierInfo.models.includes(modelName)) {
        return {
          tierName: tierInfo.name,
          credits: tierInfo.credits
        }
      }
    }
    return { tierName: "Unknown", credits: 5 }
  }

  // Group models by tier for better organization
  const modelsByTier = Object.entries(MODEL_TIERS).map(([tierId, tierInfo]) => ({
    tier: tierInfo.name,
    credits: tierInfo.credits,
    models: tierInfo.models
  }))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between max-w-xs w-full"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="truncate">{selectedModel}</span>
            {getModelInfo(selectedModel) && (
              <Badge variant="outline" className="ml-1">
                {getModelInfo(selectedModel).credits} credits
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[300px]">
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandEmpty>No model found.</CommandEmpty>
          {modelsByTier.map((tierGroup) => (
            <CommandGroup key={tierGroup.tier} heading={`${tierGroup.tier} (${tierGroup.credits} credits)`}>
              {tierGroup.models.map((model) => (
                <CommandItem
                  key={model}
                  value={model}
                  onSelect={(currentValue) => {
                    setSelectedModel(currentValue)
                    onModelSelect(currentValue)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedModel === model ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {model}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </Command>
      </PopoverContent>
    </Popover>
  )
} 