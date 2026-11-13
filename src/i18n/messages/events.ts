import { defineMessages } from '../define';
import type { OrderStatus } from '@/types';
import domain from './domain';

/*
 * Notifications and activity entries. The database stores the key and the
 * variables; the text is rendered when read, in the reader's language.
 */

type N = { title: string; message: string };

const statusFr = (s: OrderStatus) => domain.fr.orderStatus[s].label.toLowerCase();
const statusEn = (s: OrderStatus) => domain.en.orderStatus[s].label.toLowerCase();

export default defineMessages({
  fr: {
    notifications: {
      orderConfirmed: (p: { number: string }): N => ({ title: 'Commande confirmée', message: `Votre commande ${p.number} est reçue par le restaurant.` }),
      orderNew: (p: { number: string; customer: string }): N => ({ title: 'Nouvelle commande', message: `Commande ${p.number} reçue (${p.customer}).` }),
      orderStatus: (p: { number: string; status: OrderStatus }): N => ({ title: `Commande ${p.number}`, message: `Nouveau statut : ${statusFr(p.status)}.` }),
      orderCancelledCustomer: (p: { number: string; reason?: string | null }): N => ({ title: `Commande ${p.number} annulée`, message: p.reason || 'Votre commande a été annulée.' }),
      orderCancelledAdmin: (p: { number: string; system: boolean }): N => ({ title: 'Commande annulée', message: `Commande ${p.number} annulée${p.system ? ' (paiement non finalisé)' : ' par le client'}.` }),
      paymentConfirmed: (p: { number: string }): N => ({ title: 'Paiement confirmé', message: `Paiement reçu pour la commande ${p.number}.` }),
      paymentReceived: (p: { number: string }): N => ({ title: 'Paiement reçu', message: `Commande ${p.number} payée en ligne.` }),
      refundFailed: (p: { error: string }): N => ({ title: 'Remboursement à traiter', message: `Le remboursement automatique de la commande a échoué : ${p.error}` }),
      reviewNew: (p: { rating: number; firstName: string }): N => ({ title: `Nouvel avis ${p.rating} étoile(s)`, message: `${p.firstName} a laissé un avis à modérer.` }),
      contactMessage: (p: { name: string; subject: string }): N => ({ title: 'Nouveau message de contact', message: `${p.name} : ${p.subject}` }),
      lowStock: (p: { name: string; stock: number; threshold: number; unit: string }): N => ({
        title: `Stock faible : ${p.name}`,
        message: `Il reste ${p.stock} ${p.unit}, seuil d’alerte ${p.threshold} ${p.unit}.`,
      }),
    },
    activity: {
      productSaved: (p: { name: string; created: boolean }) => `Produit « ${p.name} » ${p.created ? 'créé' : 'modifié'}`,
      productToggled: (p: { name: string; active: boolean }) => `Produit « ${p.name} » ${p.active ? 'activé' : 'désactivé'}`,
      productDeleted: (p: { name: string }) => `Produit « ${p.name} » supprimé`,
      categorySaved: (p: { name: string; created: boolean }) => `Catégorie « ${p.name} » ${p.created ? 'créée' : 'modifiée'}`,
      categoryDeleted: (p: { name: string }) => `Catégorie « ${p.name} » supprimée`,
      ingredientSaved: (p: { name: string; created: boolean }) => `Ingrédient « ${p.name} » ${p.created ? 'créé' : 'modifié'}`,
      ingredientDeleted: (p: { name: string }) => `Ingrédient « ${p.name} » supprimé`,
      promotionSaved: (p: { code: string; created: boolean }) => `Promotion ${p.code} ${p.created ? 'créée' : 'modifiée'}`,
      promotionDeleted: (p: { code: string }) => `Promotion ${p.code} supprimée`,
      reviewNew: (p: { name: string }) => `Nouvel avis de ${p.name}`,
      reviewToggled: (p: { published: boolean }) => `Avis ${p.published ? 'publié' : 'masqué'}`,
      reviewDeleted: () => 'Avis supprimé',
      orderReceived: (p: { number: string }) => `Commande ${p.number} reçue`,
      orderStatus: (p: { number: string; status: OrderStatus }) => `Commande ${p.number} : ${statusFr(p.status)}`,
      orderCancelled: (p: { number: string }) => `Commande ${p.number} annulée`,
      paymentReceived: (p: { number: string }) => `Paiement reçu : commande ${p.number}`,
      settingsUpdated: () => 'Paramètres du restaurant mis à jour',
      stockMoved: (p: { name: string; delta: string; unit: string }) => `${p.name} : ${p.delta} ${p.unit}`,
      customerNew: (p: { name: string }) => `Nouveau client : ${p.name}`,
      customerStatus: (p: { name: string; blocked: boolean }) => `Client ${p.name} ${p.blocked ? 'bloqué' : 'réactivé'}`,
    },
  },
  en: {
    notifications: {
      orderConfirmed: (p) => ({ title: 'Order confirmed', message: `The restaurant has received your order ${p.number}.` }),
      orderNew: (p) => ({ title: 'New order', message: `Order ${p.number} received (${p.customer}).` }),
      orderStatus: (p) => ({ title: `Order ${p.number}`, message: `New status: ${statusEn(p.status)}.` }),
      orderCancelledCustomer: (p) => ({ title: `Order ${p.number} cancelled`, message: p.reason || 'Your order was cancelled.' }),
      orderCancelledAdmin: (p) => ({ title: 'Order cancelled', message: `Order ${p.number} cancelled${p.system ? ' (payment not completed)' : ' by the customer'}.` }),
      paymentConfirmed: (p) => ({ title: 'Payment confirmed', message: `Payment received for order ${p.number}.` }),
      paymentReceived: (p) => ({ title: 'Payment received', message: `Order ${p.number} paid online.` }),
      refundFailed: (p) => ({ title: 'Refund to process', message: `The automatic refund of the order failed: ${p.error}` }),
      reviewNew: (p) => ({ title: `New ${p.rating}-star review`, message: `${p.firstName} left a review to moderate.` }),
      contactMessage: (p) => ({ title: 'New contact message', message: `${p.name}: ${p.subject}` }),
      lowStock: (p) => ({ title: `Low stock: ${p.name}`, message: `${p.stock} ${p.unit} left, alert threshold ${p.threshold} ${p.unit}.` }),
    },
    activity: {
      productSaved: (p) => `Product “${p.name}” ${p.created ? 'created' : 'updated'}`,
      productToggled: (p) => `Product “${p.name}” ${p.active ? 'enabled' : 'disabled'}`,
      productDeleted: (p) => `Product “${p.name}” deleted`,
      categorySaved: (p) => `Category “${p.name}” ${p.created ? 'created' : 'updated'}`,
      categoryDeleted: (p) => `Category “${p.name}” deleted`,
      ingredientSaved: (p) => `Ingredient “${p.name}” ${p.created ? 'created' : 'updated'}`,
      ingredientDeleted: (p) => `Ingredient “${p.name}” deleted`,
      promotionSaved: (p) => `Promotion ${p.code} ${p.created ? 'created' : 'updated'}`,
      promotionDeleted: (p) => `Promotion ${p.code} deleted`,
      reviewNew: (p) => `New review from ${p.name}`,
      reviewToggled: (p) => `Review ${p.published ? 'published' : 'hidden'}`,
      reviewDeleted: () => 'Review deleted',
      orderReceived: (p) => `Order ${p.number} received`,
      orderStatus: (p) => `Order ${p.number}: ${statusEn(p.status)}`,
      orderCancelled: (p) => `Order ${p.number} cancelled`,
      paymentReceived: (p) => `Payment received: order ${p.number}`,
      settingsUpdated: () => 'Restaurant settings updated',
      stockMoved: (p) => `${p.name}: ${p.delta} ${p.unit}`,
      customerNew: (p) => `New customer: ${p.name}`,
      customerStatus: (p) => `Customer ${p.name} ${p.blocked ? 'blocked' : 'reactivated'}`,
    },
  },
});
