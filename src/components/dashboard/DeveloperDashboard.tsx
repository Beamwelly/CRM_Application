import React, { useState, useEffect } from 'react';
import { useCRM } from '@/context/hooks';
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from '@/lib/utils';

export function DeveloperDashboard() {
    const { users, setDeveloperAdminFilter, developerAdminFilterId } = useCRM();

    const adminUsers = users.filter(user => user.role === 'admin').map(admin => ({
        value: admin.id,
        label: admin.name,
    }));

    const [openCombobox, setOpenCombobox] = useState(false);

    const handleAdminSelect = (adminId: string | null) => {
        setDeveloperAdminFilter(adminId);
        setOpenCombobox(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col items-start space-y-2">
                <label htmlFor="admin-select-combobox" className="text-sm font-medium">Select Admin to View Data:</label>
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className="w-[300px] justify-between"
                            id="admin-select-combobox"
                        >
                            {developerAdminFilterId
                                ? adminUsers.find((admin) => admin.value === developerAdminFilterId)?.label
                                : "Select Admin..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput placeholder="Search admin..." />
                            <CommandList>
                                <CommandEmpty>No admin found.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        key="all-admins"
                                        value="all_admins_combobox_value"
                                        onSelect={() => handleAdminSelect(null)} 
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                !developerAdminFilterId ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        All Admins
                                    </CommandItem>
                                    {adminUsers.map((admin) => (
                                        <CommandItem
                                            key={admin.value}
                                            value={admin.label}
                                            onSelect={() => handleAdminSelect(admin.value)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    developerAdminFilterId === admin.value ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {admin.label}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
} 