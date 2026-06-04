import { ExternalLink, MapPin, Phone, Mail, User, FileText, Globe } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Partner } from '@/types/api'

interface Props {
  partner?: Partner | null
  /** Müşteri (faturalama) için ekstra alanlar (KDV, EORI, fatura adresi) göster */
  showCustomerExtras?: boolean
}

/**
 * Seçilen partner'ın bilgilerini okuma-amaçlı kompakt kart olarak gösterir.
 * Combobox seçiminden sonra altında render edilir.
 */
export function PartyInfoCard({ partner, showCustomerExtras = false }: Props) {
  if (!partner) return null

  const hasAddress = partner.physical_address || partner.city || partner.country
  const hasContact = partner.contact_person || partner.contact_phone || partner.contact_email
  const hasCustoms = showCustomerExtras && (partner.tax_number || partner.eori_number || partner.mersis_number)

  return (
    <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2.5 text-xs space-y-1.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {partner.partner_code && (
          <Badge variant="outline" className="font-mono text-[10px]">{partner.partner_code}</Badge>
        )}
        <span className="font-semibold text-foreground">{partner.company_name}</span>
      </div>

      {/* Adres */}
      {hasAddress && (
        <div className="flex items-start gap-1.5">
          <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">
            {[partner.physical_address, partner.postal_code, partner.city, partner.country]
              .filter(Boolean).join(', ') || '—'}
          </span>
        </div>
      )}

      {/* Kontak */}
      {hasContact && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          {partner.contact_person && (
            <span className="inline-flex items-center gap-1">
              <User className="w-3 h-3" />
              {partner.contact_person}
            </span>
          )}
          {partner.contact_phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <a href={`tel:${partner.contact_phone}`} className="hover:text-foreground hover:underline">
                {partner.contact_phone}
              </a>
            </span>
          )}
          {partner.contact_email && (
            <span className="inline-flex items-center gap-1">
              <Mail className="w-3 h-3" />
              <a href={`mailto:${partner.contact_email}`} className="hover:text-foreground hover:underline">
                {partner.contact_email}
              </a>
            </span>
          )}
        </div>
      )}

      {/* Müşteri-özel: vergi, EORI, MERSİS */}
      {hasCustoms && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-dashed">
          {partner.tax_number && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <FileText className="w-3 h-3" />
              <span className="font-semibold">VKN:</span>
              <span className="font-mono">{partner.tax_number}</span>
            </span>
          )}
          {partner.eori_number && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Globe className="w-3 h-3" />
              <span className="font-semibold">EORI:</span>
              <span className="font-mono">{partner.eori_number}</span>
            </span>
          )}
          {partner.mersis_number && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <FileText className="w-3 h-3" />
              <span className="font-semibold">MERSİS:</span>
              <span className="font-mono">{partner.mersis_number}</span>
            </span>
          )}
        </div>
      )}

      {/* Müşteri-özel: fatura adresi (farklıysa) */}
      {showCustomerExtras && partner.billing_address && partner.billing_address !== partner.physical_address && (
        <div className="flex items-start gap-1.5 pt-1 border-t border-dashed">
          <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
          <div>
            <span className="font-semibold text-muted-foreground">Fatura Adresi: </span>
            <span className="text-muted-foreground">{partner.billing_address}</span>
          </div>
        </div>
      )}

      <div className="pt-1 text-[10px] text-muted-foreground italic flex items-center gap-1">
        <ExternalLink className="w-3 h-3" />
        Partner kaydından otomatik. Bu sevkiyat için farklı bilgi gerekiyorsa aşağıdaki "Sevkiyata Özel Ek Bilgi" panelini kullanın.
      </div>
    </div>
  )
}
