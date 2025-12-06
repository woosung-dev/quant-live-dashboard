"use client"

import * as React from "react"
import { useLocale } from "next-intl"
import { useRouter, usePathname } from "@/i18n/routing"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export function LanguageSwitcher() {
    const locale = useLocale()
    const router = useRouter()
    const pathname = usePathname()

    const onSelectChange = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale })
    }

    return (
        <Select value={locale} onValueChange={onSelectChange}>
            <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ko">한국어</SelectItem>
            </SelectContent>
        </Select>
    )
}
