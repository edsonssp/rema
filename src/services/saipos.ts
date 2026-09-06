import fetch from "node-fetch"; // or use native fetch in node 18+

// Configurações da Loja e API da Saipos
export const SAIPOS_CONFIG = {
  publicKey: process.env.SAIPOS_PUBLIC_KEY || "d647e16ae694b09b57522bdd9dab4448",
  storeId: process.env.SAIPOS_STORE_ID || "74252",
  partnerId: process.env.SAIPOS_PARTNER_ID || "b63d6f22de009043b21dc6d410299bc8",
  baseUrl: process.env.SAIPOS_BASE_URL || "https://order-api.saipos.com",
  username: process.env.SAIPOS_USERNAME || "djedinhossp@gmail.com",
  password: process.env.SAIPOS_PASSWORD || "u#&W&slryOEFK2GK00ju",
  authIdPartner: process.env.SAIPOS_AUTH_ID_PARTNER || "b63d6f22de009043b21dc6d410299bc8",
  authSecret: process.env.SAIPOS_AUTH_SECRET || "d647e16ae694b09b57522bdd9dab4448",
};

// Cache de token na memória
let cachedToken: string | null = null;
let tokenExpiresAt: number | null = null;

/**
 * Autentica na Saipos (POST /auth) e obtém o Token JWT
 */
export async function getSaiposToken(): Promise<string> {
  if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedToken;
  }

  console.log("[Saipos] Solicitando novo token de autenticação via /auth...");
  const response = await fetch(`${SAIPOS_CONFIG.baseUrl}/auth`, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      idPartner: SAIPOS_CONFIG.authIdPartner,
      secret: SAIPOS_CONFIG.authSecret
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[Saipos] Erro na autenticação:", errText);
    throw new Error(`Falha na autenticação da Saipos: ${errText}`);
  }

  const data = await response.json() as { token?: string; [key: string]: any };
  if (!data.token) {
    throw new Error("Token não retornado pela Saipos no login /auth");
  }

  cachedToken = data.token;
  // Expira em 24h por padrão
  tokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
  console.log("[Saipos] Token obtido com sucesso!");
  return cachedToken;
}

/**
 * Mapeia o método de pagamento para o código aceito pela Saipos
 */
function mapPaymentMethodToSaiposCode(methodName: string = ""): string {
  const norm = methodName.toLowerCase();
  if (norm.includes("pix")) return "PIX";
  if (norm.includes("dinheiro") || norm.includes("din")) return "DIN";
  if (norm.includes("crédito") || norm.includes("credito")) return "CREDITO";
  if (norm.includes("débito") || norm.includes("debito")) return "DEBITO";
  return "OUTROS";
}

/**
 * Extrai número do logradouro se existir no texto do endereço
 */
function parseAddressDetails(rawAddress: string = "") {
  let streetName = rawAddress.trim() || "Balcão / Não informado";
  let streetNumber = "S/N";
  let district = "Centro";

  // Tenta extrair número comum (ex: Rua das Flores, 123 - Centro)
  const parts = rawAddress.split(/[,-]/).map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    streetName = parts[0];
    const possibleNumber = parts[1].replace(/\D/g, "");
    if (possibleNumber) {
      streetNumber = possibleNumber;
    }
    if (parts.length >= 3) {
      district = parts[2];
    }
  }

  return { streetName, streetNumber, district };
}

/**
 * Envia o pedido finalizado diretamente para a Saipos (POST /order)
 */
export async function sendOrderToSaipos(orderData: any) {
  try {
    console.log("[Saipos] Iniciando envio do pedido para o PDV Saipos...");

    const token = await getSaiposToken();
    const orderId = orderData._id ? orderData._id.toString() : (orderData.id || String(Date.now()));
    const displayId = orderId.slice(-4).toUpperCase();
    const isPickup = orderData.clientInfo?.deliveryType === "pickup" || orderData.deliveryType === "pickup";
    const { streetName, streetNumber, district } = parseAddressDetails(orderData.clientInfo?.address || orderData.address || "");

    const deliveryFee = Number(orderData.deliveryFee) || 0;
    const totalAmount = Number(orderData.total) || 0;
    const paymentCode = mapPaymentMethodToSaiposCode(orderData.paymentMethod);

    // Mapeamento exato conforme a documentação oficial da Saipos Order API:
    const saiposPayload = {
      order_id: String(orderId),
      display_id: String(displayId),
      cod_store: String(SAIPOS_CONFIG.storeId),
      created_at: (orderData.createdAt ? new Date(orderData.createdAt) : new Date()).toISOString(),
      notes: orderData.notes || orderData.clientInfo?.notes || (orderData.source === 'whatsapp' ? "Pedido via WhatsApp IA" : "Pedido via Cardápio Web"),
      total_increase: 0,
      total_discount: 0,
      total_amount: totalAmount,
      customer: {
        id: String(orderData.clientInfo?.phone ? orderData.clientInfo.phone.replace(/\D/g, "") : orderId),
        name: orderData.clientInfo?.name || "Cliente Amarena",
        phone: String(orderData.clientInfo?.phone ? orderData.clientInfo.phone.replace(/\D/g, "") : "00000000000"),
        document_number: String(orderData.clientInfo?.cpf || "")
      },
      order_method: {
        mode: isPickup ? "TAKEOUT" : "DELIVERY",
        delivery_by: isPickup ? "RESTAURANT" : "RESTAURANT",
        delivery_fee: deliveryFee,
        scheduled: false,
        delivery_date_time: new Date(Date.now() + 40 * 60 * 1000).toISOString()
      },
      delivery_address: {
        country: "BR",
        state: "MG",
        city: "Passos",
        district: district,
        street_name: streetName,
        street_number: streetNumber,
        postal_code: "37900000",
        reference: orderData.clientInfo?.reference || "",
        complement: orderData.clientInfo?.complement || "",
        coordinates: {
          latitude: 0,
          longitude: 0
        }
      },
      items: (orderData.items || []).map((item: any, index: number) => {
        const choiceItems: any[] = [];
        
        // Mapeia adicionais/sabores se houver
        if (Array.isArray(item.options)) {
          item.options.forEach((opt: any, optIdx: number) => {
            choiceItems.push({
              integration_code: String(opt.id || `${item.id || index}_opt_${optIdx}`),
              desc_item_choice: typeof opt === "string" ? opt : (opt.name || opt.desc || "Opção"),
              aditional_price: typeof opt === "object" && opt.price ? Number(opt.price) : 0,
              quantity: 1,
              notes: ""
            });
          });
        }

        if (Array.isArray(item.flavors)) {
          item.flavors.forEach((flavor: any, flvIdx: number) => {
            choiceItems.push({
              integration_code: String(flavor.id || `${item.id || index}_flv_${flvIdx}`),
              desc_item_choice: typeof flavor === "string" ? `Sabor: ${flavor}` : (flavor.name || "Sabor"),
              aditional_price: typeof flavor === "object" && flavor.price ? Number(flavor.price) : 0,
              quantity: 1,
              notes: ""
            });
          });
        }

        return {
          integration_code: String(item.id || item._id || (index + 1)),
          desc_item: String(item.name || "Item Amarena"),
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.price) || 0,
          notes: item.notes || (item.size ? `Tamanho: ${item.size}` : ""),
          choice_items: choiceItems
        };
      }),
      payment_types: [
        {
          code: paymentCode,
          amount: totalAmount,
          change_for: Number(orderData.changeFor) || 0
        }
      ]
    };

    console.log(`[Saipos] Enviando JSON para POST ${SAIPOS_CONFIG.baseUrl}/order...`);

    const response = await fetch(`${SAIPOS_CONFIG.baseUrl}/order`, {
      method: "POST",
      headers: {
        "Authorization": token,
        "accept": "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify(saiposPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Saipos] Erro retornado pela Saipos:", errorText);
      return { success: false, error: errorText, payload: saiposPayload };
    }

    const data = await response.json();
    console.log("[Saipos] Pedido entregue com sucesso para a Saipos! Resposta:", data);
    return { success: true, data };

  } catch (error: any) {
    console.error("[Saipos] Erro na integração sendOrderToSaipos:", error);
    return { success: false, error: error?.message || String(error) };
  }
}

