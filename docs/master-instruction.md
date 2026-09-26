# AI AGENT MASTER INSTRUCTION
## Project: Simple Ecommerce CMS — Shopify-like, but radically easier

---

# 1. ROLE

You are the lead product architect, senior full-stack engineer, UI/UX designer, database architect, QA engineer, and technical project manager for this project.

Your job is to design and build a modern, scalable, multi-tenant ecommerce CMS that allows **any type of business to create and manage an online store without technical knowledge**.

The platform should provide the core power of Shopify while being:

- Easier to understand
- Faster to set up
- Less intimidating
- More affordable to operate
- Mobile-friendly
- WhatsApp-first
- Simple enough for a first-time business owner
- Flexible enough for established businesses

Do not build a complicated enterprise system unless a feature genuinely requires it.

The guiding principle is:

> **If a normal business owner cannot understand what to do next, the product is too complicated.**

---

# 2. PRODUCT VISION

Build an ecommerce CMS where a business can:

1. Create an account.
2. Create their store.
3. Add products.
4. Add product images.
5. Set prices.
6. Manage inventory.
7. Organize products into categories.
8. Customize their storefront.
9. Add their business information.
10. Connect WhatsApp.
11. Receive customer orders through WhatsApp.
12. Add their preferred payment method.
13. Accept online payments if they choose.
14. Manage orders.
15. Manage customers.
16. View sales and basic analytics.
17. Share their store link.
18. Eventually connect a custom domain.
19. Manage everything from one simple dashboard.

The platform should work for virtually any product-selling business:

- Fashion
- Beauty
- Hair
- Cosmetics
- Electronics
- Restaurants selling products
- Furniture
- Jewelry
- Supermarkets
- Grocery stores
- Pharmacies where legally appropriate
- Auto parts
- Home products
- Digital products where supported
- Handmade products
- Services with purchasable items
- Small businesses
- Medium businesses
- Large catalogs

The CMS should not be designed around one industry.

---

# 3. CORE DIFFERENTIATOR

The biggest differentiator is:

## WEBSITE + WHATSAPP + PAYMENT

A customer should be able to:

### Option A — WhatsApp checkout

Customer:

Store → Product → Add to Cart → Checkout → WhatsApp

The system generates a structured WhatsApp order message containing:

- Customer name
- Phone number
- Products
- Quantities
- Prices
- Subtotal
- Delivery fee if applicable
- Total
- Delivery information
- Payment preference
- Order reference

The customer is then redirected/opened into WhatsApp with the order message prepared.

---

### Option B — Online payment

Customer:

Store → Product → Cart → Checkout → Payment → Order Confirmation

The merchant should be able to configure their own supported payment provider.

The platform must not hard-code one payment provider as the only option.

Payment architecture must be provider-based.

For example:

PaymentProvider
- Provider A
- Provider B
- Provider C
- Manual Bank Transfer
- Cash on Delivery
- WhatsApp Payment
- Other supported providers

---

### Option C — Merchant-defined payment instructions

A merchant should be able to add their own payment method manually.

Example:

Payment method:
"Bank Transfer"

Details:

Bank: Example Bank  
Account Name: Example Store  
Account Number: XXXXXXXX

The customer sees the instructions after checkout.

The merchant can then manually confirm payment.

---

# 4. PRODUCT PRINCIPLE

The platform should feel like:

> "Create your store in minutes."

Not:

> "Configure your ecommerce infrastructure."

Avoid unnecessary technical terminology.

Do not expose complex concepts unless necessary.

For example, instead of:

"Configure product variants and inventory allocation"

use:

"Add options"

Instead of:

"Configure checkout behavior"

use:

"Checkout settings"

Instead of:

"Configure payment gateway"

use:

"How customers pay"

---

# 5. TARGET USER

The primary user is a business owner who may have:

- Never built a website
- Never used Shopify
- Limited technical knowledge
- A smartphone
- WhatsApp
- Instagram/Facebook
- Products they want to sell online

The system must therefore be extremely intuitive.

A merchant should be able to launch a basic store without reading documentation.

---

# 6. MULTI-TENANT ARCHITECTURE

This is a SaaS ecommerce CMS.

Multiple businesses must be able to use the same platform independently.

Each business/store must have isolated:

- Products
- Categories
- Orders
- Customers
- Payments
- Store settings
- Branding
- Users
- Analytics
- Media
- Discounts
- Shipping settings

Never allow one merchant to access another merchant's data.

Every tenant-owned resource must have a clear store/tenant relationship.

---

# 7. MAIN SYSTEM AREAS

Build the platform around these primary areas:

## Merchant Dashboard

- Overview
- Orders
- Products
- Categories
- Customers
- Discounts
- Payments
- Store
- Analytics
- Settings

Do not overload the sidebar.

The most important actions should always be visible.

---

# 8. DASHBOARD

The dashboard should immediately answer:

### How is my store doing?

Show:

- Today's sales
- Orders today
- Pending orders
- Products
- Customers
- Low-stock products

Optional:

- Sales chart
- Recent orders
- Top products
- Recent customers

The dashboard should be simple.

Avoid unnecessary graphs and metrics.

---

# 9. PRODUCT MANAGEMENT

Products are one of the most important features.

The merchant should be able to create a product quickly.

Product fields:

- Product name
- Description
- Images
- Price
- Compare-at price
- SKU
- Inventory quantity
- Category
- Status
- Product type
- Brand
- Tags
- Weight
- Dimensions
- SEO title
- SEO description

Optional fields should remain optional.

Do not force merchants to fill unnecessary fields.

---

# 10. PRODUCT VARIANTS

Support product options.

Example:

T-Shirt

Color:
- Black
- White
- Red

Size:
- S
- M
- L
- XL

Each variant can have:

- Price
- SKU
- Inventory
- Image

The UI must make variants easy to create.

Avoid complicated variant configuration screens.

Provide:

> Add option

instead of forcing merchants through complicated forms.

---

# 11. PRODUCT IMAGES

Merchants must be able to:

- Upload multiple images
- Reorder images
- Select primary image
- Delete images
- Replace images

The storefront must automatically optimize images where possible.

Use appropriate responsive image formats.

---

# 12. INVENTORY

Inventory must remain simple.

Basic functionality:

- Stock quantity
- In stock
- Low stock
- Out of stock
- Track inventory
- Allow selling when out of stock

Show clear warnings.

Example:

"Only 3 left"

Do not expose complicated inventory accounting unless explicitly added later.

---

# 13. CATEGORIES

Merchants can:

- Create categories
- Edit categories
- Delete categories
- Assign products
- Add category image
- Add category description

Support nested categories if useful, but do not make them mandatory.

Example:

Fashion
→ Women's Fashion
→ Dresses

---

# 14. STOREFRONT

Every merchant receives a storefront.

Example:

platform.com/store/store-name

or:

store-name.platform.com

Eventually support:

store-name.com

through custom domains.

The storefront must be:

- Responsive
- Fast
- Mobile-first
- SEO-friendly
- Accessible
- Professional
- Easy to customize

---

# 15. STOREFRONT STRUCTURE

Basic storefront:

Header

- Logo
- Search
- Cart
- Menu

Homepage

- Hero/banner
- Featured products
- Categories
- Promotional section
- New arrivals
- Popular products

Product page

- Images
- Product name
- Price
- Description
- Options
- Quantity
- Add to cart
- Buy now
- WhatsApp button

Cart

- Products
- Quantity
- Prices
- Subtotal
- Remove
- Checkout

Checkout

- Customer information
- Delivery information
- Payment method
- Order summary

Confirmation

- Order number
- Order details
- Payment instructions if applicable
- WhatsApp option

---

# 16. STOREFRONT CUSTOMIZATION

The merchant should be able to customize their store without coding.

Allow:

- Logo
- Store name
- Primary color
- Secondary color
- Fonts
- Banner
- Homepage sections
- Product layout
- Social links
- Contact information

Use templates/themes.

However, do not recreate Shopify's overly complex theme editor.

Create a simplified visual editor.

---

# 17. THEME SYSTEM

Build a reusable theme architecture.

A theme should define:

- Header
- Footer
- Homepage
- Product page
- Category page
- Cart
- Checkout
- Search

The merchant can select a theme.

Example:

### Themes

- Minimal
- Modern
- Fashion
- Beauty
- Storefront
- Restaurant
- Electronics

But themes should be generic enough to support different businesses.

---

# 18. WHATSAPP INTEGRATION

WhatsApp is a core feature, not an optional afterthought.

Merchant settings:

WhatsApp number:
+XXXXXXXXXXX

Enable:

"Receive orders on WhatsApp"

The merchant should be able to choose:

### WhatsApp order behavior

- Send every order to WhatsApp
- Let customer choose WhatsApp checkout
- Use WhatsApp as contact button

Generate structured messages.

Example:

NEW ORDER #QS-1042

Customer:
John Doe

Phone:
08000000000

Items:

1 × Black T-Shirt — ₦15,000
2 × White Shirt — ₦20,000

Subtotal:
₦35,000

Delivery:
₦3,000

TOTAL:
₦38,000

Delivery Address:
Lekki Phase 1, Lagos

Payment:
Bank Transfer

The message must be readable.

---

# 19. WHATSAPP BUSINESS SETTINGS

Allow merchants to configure:

- WhatsApp number
- Default message
- Order message format
- WhatsApp button visibility
- WhatsApp checkout
- WhatsApp customer support

Do not require WhatsApp Business API for the basic functionality if a normal WhatsApp deep link is sufficient.

The architecture should however allow WhatsApp API integration later.

---

# 20. PAYMENT SYSTEM

Payment must be modular.

Create a payment abstraction layer.

Example conceptual architecture:

Payment
├── Payment Provider Interface
├── Provider Configuration
├── Payment Intent
├── Transaction
├── Payment Status
└── Webhook Handler

Supported payment types:

### Online payment

Merchant connects a supported payment provider.

### Manual payment

Merchant enters payment instructions.

### Cash on delivery

Merchant can enable COD.

### WhatsApp

Customer completes order through WhatsApp.

Never assume every merchant uses the same payment provider.

---

# 21. PAYMENT PROVIDER ARCHITECTURE

Payment providers must be plugins/adapters.

Conceptually:

PaymentProvider

Methods:

- initializePayment()
- verifyPayment()
- refundPayment()
- handleWebhook()
- getPaymentStatus()

This allows future providers to be added without rewriting checkout.

---

# 22. ORDER MANAGEMENT

Orders are central to the system.

Each order must have:

- Order ID
- Customer
- Items
- Quantity
- Product price
- Subtotal
- Discount
- Shipping
- Tax if applicable
- Total
- Payment method
- Payment status
- Fulfillment status
- Delivery address
- Customer notes
- Created date
- Updated date

Order statuses:

### Payment

- Pending
- Paid
- Failed
- Refunded
- Partially refunded

### Fulfillment

- New
- Confirmed
- Processing
- Ready
- Shipped
- Delivered
- Cancelled

Do not combine payment status and order status into one field.

---

# 23. ORDER FLOW

Example:

Customer places order.

System:

1. Creates order.
2. Generates order number.
3. Saves customer.
4. Saves order items.
5. Calculates totals.
6. Determines payment status.
7. Sends merchant notification.
8. Sends customer confirmation.
9. If WhatsApp checkout is selected, generate WhatsApp message.
10. Update inventory where appropriate.

The system must avoid duplicate orders during payment retries or webhook retries.

---

# 24. CUSTOMER MANAGEMENT

Merchants should be able to see:

- Customer name
- Phone
- Email
- Orders
- Total spent
- Last order
- Address
- Notes

Customer profiles should automatically be created when customers order.

Do not force customers to create an account before purchasing.

Guest checkout should be supported.

---

# 25. SEARCH

Merchant dashboard:

Search:

- Products
- Orders
- Customers

Storefront:

Search:

- Products
- Categories

Search must be fast and forgiving.

---

# 26. DISCOUNTS

Basic discount system:

- Percentage discount
- Fixed amount
- Coupon code
- Minimum order amount
- Expiration
- Usage limit
- Product/category restrictions

Keep the UI simple.

Example:

Create discount

Code:

WELCOME10

Discount:

10%

Expires:

31 Dec

Save.

---

# 27. SHIPPING

Merchants should be able to configure simple shipping rules.

Examples:

Lagos:
₦3,000

Abuja:
₦5,000

Free delivery:
Orders above ₦100,000

Pickup:
Free

The system should eventually support:

- Zones
- Flat rates
- Free shipping
- Pickup
- Delivery fee by location
- Weight-based shipping

But the first version should prioritize simplicity.

---

# 28. TAX

Create tax architecture, but do not force complicated tax configuration.

Merchant can:

- Enable tax
- Set tax rate
- Include tax in product price
- Add tax at checkout

Tax logic must be configurable by store.

---

# 29. STORE SETTINGS

Store settings should include:

### General

- Store name
- Logo
- Description
- Contact email
- Phone
- Address

### WhatsApp

- WhatsApp number
- WhatsApp checkout
- WhatsApp button

### Payments

- Payment providers
- Manual payment methods
- COD

### Shipping

- Delivery zones
- Shipping rates
- Pickup

### Notifications

- Email notifications
- Order notifications
- Customer notifications

### Storefront

- Theme
- Branding
- Homepage

### Domains

- Store URL
- Custom domain

### SEO

- Meta title
- Meta description
- Social sharing image

---

# 30. ANALYTICS

Keep analytics understandable.

Show:

- Revenue
- Orders
- Average order value
- Customers
- Products sold
- Top products
- Sales by day
- Sales by month

Future:

- Conversion rate
- Traffic sources
- Abandoned carts
- Customer retention

Do not build an unnecessarily complicated analytics platform in V1.

---

# 31. NOTIFICATIONS

Merchant notifications:

- New order
- Payment received
- Low stock
- Failed payment
- Order cancelled

Customer notifications:

- Order received
- Payment confirmed
- Order processing
- Order shipped
- Order delivered
- Order cancelled

Support email initially.

Design notification architecture so WhatsApp/SMS/push can be added later.

---

# 32. ADMIN PANEL

There must be a platform-level administration system separate from merchant dashboards.

Platform administrators can manage:

- Merchants
- Stores
- Users
- Plans
- Payments
- Platform settings
- Themes
- System logs
- Reports
- Support
- Feature flags

Admin access must be strongly protected.

Never expose platform administration functionality to normal merchants.

---

# 33. SUBSCRIPTION / SAAS ARCHITECTURE

The platform should be capable of supporting subscription plans.

Possible plans:

### Free

- Store
- Limited products
- WhatsApp orders

### Starter

- More products
- Custom branding
- Payment integration

### Business

- Unlimited products
- Advanced analytics
- Custom domain
- More features

The exact pricing is not part of the core architecture.

Build feature entitlements so plans can be changed later.

---

# 34. FEATURE FLAGS

Create a feature entitlement system.

Example:

store.custom_domain = true

analytics.advanced = false

products.unlimited = true

This allows future plans without rewriting the application.

---

# 35. AUTHENTICATION

Support:

- Email/password
- Password reset
- Email verification
- Session management

Architecture should allow future:

- Google login
- Apple login
- Phone authentication

Users can belong to stores.

Future support:

- Store owner
- Manager
- Staff

---

# 36. ROLE-BASED ACCESS CONTROL

Create permissions.

Example:

OWNER

- Everything

MANAGER

- Products
- Orders
- Customers
- Analytics

STAFF

- Orders
- Products

Do not overcomplicate V1, but the architecture must support permissions.

---

# 37. DATABASE PRINCIPLES

Use a clean relational or document data model depending on the selected stack.

Core entities:

User

Store

StoreMember

Product

ProductVariant

Category

ProductCategory

ProductImage

Inventory

Customer

Address

Order

OrderItem

Payment

PaymentProvider

PaymentMethod

Discount

DiscountUsage

ShippingZone

ShippingRate

Theme

StoreSettings

Notification

Subscription

FeatureEntitlement

AuditLog

Do not create unnecessary tables/collections.

Every entity must have a clear purpose.

---

# 38. DATA ISOLATION

This is mandatory.

Every merchant-owned entity must belong to a store.

Example:

storeId

Never retrieve products globally without tenant filtering.

All queries must enforce tenant isolation.

Do not rely only on frontend restrictions.

Enforce authorization at the backend/database level.

---

# 39. SECURITY

Security is a core requirement.

Implement:

- Authentication
- Authorization
- Tenant isolation
- Input validation
- Server-side validation
- Rate limiting
- Secure secrets
- Secure payment handling
- Webhook verification
- CSRF protection where applicable
- XSS protection
- SQL/NoSQL injection protection
- Secure file uploads
- Audit logs
- Secure sessions
- HTTPS in production

Never expose payment secret keys in frontend code.

Never trust prices submitted by the browser.

Always calculate order totals server-side.

---

# 40. ORDER SECURITY

Never trust:

- Product price from frontend
- Discount value from frontend
- Shipping price from frontend
- Tax from frontend
- Product availability from frontend

When an order is created:

1. Retrieve product.
2. Verify store ownership.
3. Retrieve current price.
4. Verify inventory.
5. Calculate totals.
6. Apply discount rules.
7. Calculate shipping.
8. Calculate tax.
9. Create order.

The frontend is only a request source.

---

# 41. MEDIA SYSTEM

Build a centralized media system.

Merchants can upload:

- Product images
- Logo
- Store banners
- Category images
- Social sharing images

Store files by tenant.

Example conceptual structure:

stores/{storeId}/products/
stores/{storeId}/categories/
stores/{storeId}/branding/

Never allow one store to overwrite another store's files.

---

# 42. MOBILE-FIRST ADMIN

The merchant dashboard must work extremely well on mobile.

Many merchants will manage their businesses from their phones.

Desktop:

Sidebar + dashboard

Mobile:

Bottom navigation or compact menu.

Critical actions should remain accessible:

- Add product
- Orders
- Products
- Store
- More

---

# 43. UX RULES

Follow these principles:

### Rule 1
One screen = one primary purpose.

### Rule 2
Use plain language.

### Rule 3
Avoid unnecessary settings.

### Rule 4
Use sensible defaults.

### Rule 5
Make the most common action obvious.

### Rule 6
Never make the merchant configure something they don't need.

### Rule 7
Progressive disclosure.

Advanced options should stay hidden until needed.

---

# 44. ONBOARDING

When a new merchant signs up:

Step 1:

"What do you sell?"

Step 2:

"What's your store name?"

Step 3:

"Add your first product"

Step 4:

"How should customers contact you?"

Step 5:

"How should customers pay?"

Step 6:

"Your store is ready."

Avoid long registration forms.

---

# 45. QUICK STORE CREATION

A merchant should be able to launch a functional store in minutes.

Ideal flow:

Sign up

↓

Store name

↓

Add first product

↓

Add WhatsApp

↓

Choose payment method

↓

Choose theme

↓

Publish

The merchant should immediately receive:

"Your store is live."

With:

Copy store link

Share on WhatsApp

Share on Instagram

View store

---

# 46. PRODUCT CREATION UX

The fastest possible product creation flow should be:

Add Product

Product name

Upload images

Price

Description

Inventory

Category

Save

Advanced settings remain collapsed.

Example:

[Basic information]

[Pricing]

[Inventory]

[Options]

[Shipping]

[SEO]

The merchant should not be overwhelmed.

---

# 47. BULK PRODUCT MANAGEMENT

Eventually support:

- CSV import
- CSV export
- Bulk price updates
- Bulk inventory updates
- Bulk category changes
- Bulk delete

Do not make bulk tools necessary for normal usage.

---

# 48. SEO

Every storefront must be SEO-ready.

Automatically generate:

- Product URLs
- Category URLs
- Meta titles
- Meta descriptions
- Open Graph metadata
- Canonical URLs
- Sitemap
- Robots configuration
- Structured product data

Allow merchants to customize SEO fields.

Default SEO should work even if the merchant does nothing.

---

# 49. PERFORMANCE

The storefront must be fast.

Prioritize:

- Optimized images
- Lazy loading
- CDN
- Caching
- Efficient queries
- Pagination
- Code splitting
- Server-side rendering or static generation where appropriate

Do not sacrifice storefront speed for unnecessary animations.

---

# 50. ACCESSIBILITY

Follow modern accessibility principles.

Support:

- Keyboard navigation
- Proper labels
- Semantic HTML
- Accessible forms
- Contrast
- Screen readers
- Focus states
- Error messages

---

# 51. INTERNATIONALIZATION

Build the system so it can support multiple languages.

Do not hard-code interface strings.

Example:

en:
"Add Product"

fr:
"Ajouter un produit"

All interface text must come from translation resources.

Also support multiple currencies.

A store should have:

- Currency
- Currency symbol
- Currency formatting rules

Do not assume USD.

---

# 52. LOCALIZATION

The platform must work globally.

Do not hard-code:

- Currency
- Phone formats
- Addresses
- Tax
- Payment provider
- Shipping rules

The architecture must allow different countries and payment systems.

---

# 53. CUSTOMER CHECKOUT

Do not force account creation.

Basic checkout:

Customer name

Phone

Email — optional

Delivery address

City/location

Delivery method

Payment method

Order summary

Place order

For WhatsApp checkout:

Place order → Generate WhatsApp order → Open WhatsApp.

---

# 54. CART

Cart should persist where possible.

Support:

- Add
- Remove
- Increase quantity
- Decrease quantity
- Clear cart

Validate product availability when checkout begins.

---

# 55. ABANDONED CARTS

Architecture should allow abandoned cart tracking later.

Do not make this a V1 priority.

---

# 56. STORE URL

Every store receives a unique URL.

Example:

shop.yourplatform.com/store-name

or:

yourplatform.com/store/store-name

Store slug must be:

- Unique
- URL-safe
- Editable under controlled rules

If the merchant changes the slug, handle old URLs appropriately where possible.

---

# 57. CUSTOM DOMAIN

Architecture must eventually support:

www.mystore.com

Merchant enters domain.

System provides DNS instructions.

Verify domain ownership.

Connect domain.

Do not make custom domains mandatory for V1.

---

# 58. API-FIRST ARCHITECTURE

Create clean APIs between:

Frontend

Backend

Database

Payment system

Notification system

Media system

WhatsApp integration

Do not tightly couple unrelated modules.

---

# 59. MODULAR ARCHITECTURE

Organize the code by business features.

Preferred conceptual structure:

auth

stores

products

categories

inventory

orders

customers

payments

shipping

discounts

analytics

notifications

themes

media

subscriptions

admin

shared

Each feature should contain its own:

- Components
- Services
- Validation
- Types/models
- API logic

Avoid a giant components folder containing unrelated business logic.

---

# 60. SHARED DESIGN SYSTEM

Create reusable UI components.

Examples:

Button

Input

Textarea

Select

Modal

Drawer

Dropdown

Tabs

Card

Badge

Table

Pagination

Toast

Alert

EmptyState

LoadingState

ConfirmDialog

ImageUploader

PriceInput

ProductSelector

OrderStatusBadge

Do not repeatedly recreate the same UI.

---

# 61. DESIGN LANGUAGE

The interface should feel:

- Modern
- Clean
- Friendly
- Professional
- Fast
- Minimal

Avoid:

- Excessive gradients
- Excessive animations
- Clutter
- Tiny text
- Huge dashboards
- Unnecessary charts
- Complicated navigation

Think:

"Shopify simplicity + modern SaaS usability + WhatsApp familiarity."

---

# 62. ERROR HANDLING

Errors must be understandable.

Bad:

"ERR_DB_500"

Better:

"We couldn't save your product. Please try again."

For validation:

"Product name is required."

Never expose raw database errors to users.

---

# 63. EMPTY STATES

Every list must have a useful empty state.

Products:

"No products yet."

"Add your first product to start selling."

[Add Product]

Orders:

"No orders yet."

"Your orders will appear here when customers buy from your store."

---

# 64. LOADING STATES

Use:

- Skeleton loaders
- Loading buttons
- Progress indicators

Never leave the interface appearing frozen.

Prevent duplicate button submissions.

---

# 65. CONFIRMATION STATES

After important actions:

"Product added successfully."

"Order updated."

"Store published."

"Payment method connected."

Give clear feedback.

---

# 66. AUDIT LOGGING

Track important merchant actions:

- Product created
- Product updated
- Product deleted
- Order updated
- Payment configuration changed
- Store settings changed
- Staff permissions changed

Useful for troubleshooting and security.

---

# 67. BACKUPS AND RECOVERY

The architecture should support:

- Database backups
- Media backups
- Recovery procedures

Never design the system assuming data loss is acceptable.

---

# 68. TESTING

Every major feature requires testing.

Test:

Authentication

Store creation

Product creation

Product editing

Product deletion

Categories

Inventory

Cart

Checkout

Orders

WhatsApp checkout

Payment

Payment webhook

Customer creation

Discounts

Shipping

Tenant isolation

Permissions

Storefront

Mobile UI

SEO

Error states

---

# 69. PAYMENT TESTING

Payment integrations must have test/sandbox modes where providers support them.

Test:

Successful payment

Failed payment

Cancelled payment

Duplicate webhook

Delayed webhook

Invalid webhook

Incorrect amount

Expired payment

Refund

Never mark a payment as successful simply because the frontend says it succeeded.

Verify server-side.

---

# 70. DEVELOPMENT WORKFLOW

Do NOT attempt to build the entire application at once.

Build incrementally.

Use this order:

## PHASE 1 — FOUNDATION

- Project setup
- Architecture
- Environment configuration
- Authentication
- Database
- Tenant model
- Basic UI system

## PHASE 2 — STORE

- Store creation
- Store settings
- Store URL
- Storefront foundation

## PHASE 3 — PRODUCTS

- Products
- Images
- Categories
- Inventory
- Variants

## PHASE 4 — STOREFRONT

- Homepage
- Category pages
- Product pages
- Search
- Cart

## PHASE 5 — CHECKOUT

- Customer checkout
- Orders
- WhatsApp checkout
- Manual payments

## PHASE 6 — ONLINE PAYMENTS

- Payment abstraction
- Provider integration
- Webhooks
- Payment verification

## PHASE 7 — BUSINESS MANAGEMENT

- Customers
- Discounts
- Shipping
- Notifications

## PHASE 8 — ANALYTICS

- Sales
- Orders
- Customers
- Products

## PHASE 9 — SAAS

- Subscription plans
- Feature limits
- Billing

## PHASE 10 — ADVANCED

- Custom domains
- Advanced analytics
- Staff accounts
- More payment providers
- More integrations
- Mobile applications

---

# 71. DEVELOPMENT RULE

For every phase:

1. Inspect existing architecture.
2. Understand what already exists.
3. Do not unnecessarily replace working code.
4. Implement the smallest correct change.
5. Test it.
6. Fix errors.
7. Verify functionality.
8. Only then move to the next feature.

Never rebuild working functionality without a reason.

---

# 72. DO NOT MAKE UNNECESSARY CHANGES

This is a strict rule.

Do not:

- Change architecture without justification
- Replace libraries without reason
- Rename established modules unnecessarily
- Create duplicate systems
- Introduce unnecessary dependencies
- Rewrite working code
- Create unnecessary abstractions

If a change could affect existing functionality, explain the reason before making it.

---

# 73. AI AGENT BEHAVIOR

Before writing code:

Understand the requirement.

Then determine:

- What feature is being built?
- Which existing modules are affected?
- Which database entities are required?
- Which APIs are required?
- Which UI components can be reused?
- What security implications exist?
- What tests are required?

Then implement.

Do not blindly generate code.

---

# 74. DO NOT OVERENGINEER

Do not build:

- Enterprise-level workflow engines
- Unnecessary microservices
- Complex event buses
- Excessive abstractions
- Complicated configuration systems

unless there is a real requirement.

Start as a clean modular monolith if appropriate.

It should be easy to understand and maintain.

---

# 75. BUSINESS LOGIC RULE

Business logic must not live exclusively in the frontend.

Frontend:

- UI
- Interaction
- Presentation

Backend:

- Authentication
- Authorization
- Pricing
- Orders
- Payments
- Inventory
- Discounts
- Store ownership
- Business rules

---

# 76. PRODUCT PRICING RULE

Never trust frontend prices.

The backend must retrieve the current product/variant price from the database when creating an order.

---

# 77. INVENTORY RULE

Inventory updates must be handled safely.

Prevent:

- Negative inventory unless enabled
- Double deduction
- Duplicate order deduction

Inventory behavior must account for failed payments and cancelled orders.

---

# 78. PAYMENT RULE

Never store sensitive card information unless absolutely required and compliant.

Prefer redirect/tokenized payment systems provided by payment processors.

---

# 79. WHATSAPP ORDER RULE

WhatsApp checkout should not replace the internal order system.

When appropriate:

1. Create/order intent.
2. Generate order reference.
3. Prepare WhatsApp message.
4. Open WhatsApp.
5. Track the order state.

The system should still know that the customer initiated an order.

---

# 80. MERCHANT EXPERIENCE

Every feature should answer:

> "Does this help the merchant sell more easily?"

If not, question whether it belongs in the primary interface.

---

# 81. CUSTOMER EXPERIENCE

Customer should be able to:

Open store

↓

Find product

↓

View product

↓

Add to cart

↓

Checkout

↓

Choose payment

↓

Place order

↓

Receive confirmation

with as little friction as possible.

---

# 82. MOBILE CUSTOMER EXPERIENCE

Most ecommerce traffic may come from mobile.

Therefore:

- Large tap targets
- Fast loading
- Sticky cart where appropriate
- Easy checkout
- Minimal forms
- WhatsApp integration
- Responsive product galleries
- Mobile-friendly navigation

---

# 83. ADMIN MOBILE EXPERIENCE

Merchant must be able to:

- Add product
- Edit product
- Check orders
- Update order
- View customer
- Check sales

from a phone.

---

# 84. PLATFORM BRANDING

Do not assume the platform's branding should dominate merchant storefronts.

Merchants should feel that the store belongs to them.

The platform may display a small "Powered by [Platform]" attribution depending on subscription plan.

Architecture should allow this attribution to be hidden for paid plans.

---

# 85. FUTURE INTEGRATIONS

Design the architecture so integrations can eventually include:

- WhatsApp
- Payment providers
- Instagram
- Facebook
- Google
- Email marketing
- SMS
- Shipping companies
- Accounting systems
- POS systems
- Marketplaces
- Analytics platforms

Do not implement all of these in V1.

---

# 86. AI FEATURES — FUTURE

Potential future AI functionality:

- Generate product descriptions
- Generate SEO titles
- Generate SEO descriptions
- Background removal
- Product image enhancement
- Sales insights
- Product recommendations
- Inventory predictions
- Marketing suggestions
- WhatsApp message generation

AI should enhance the platform, not make the basic product dependent on AI.

---

# 87. V1 MUST BE FOCUSED

The first production-ready version should prioritize:

### Merchant

- Signup/login
- Create store
- Store settings
- Add products
- Categories
- Inventory
- Basic customization
- WhatsApp
- Payment methods
- Orders
- Customers

### Customer

- Storefront
- Product browsing
- Search
- Cart
- Checkout
- WhatsApp checkout
- Payment
- Order confirmation

### Platform

- Admin
- Merchant management
- Basic subscription architecture
- Security
- Tenant isolation

Everything else can follow.

---

# 88. SUCCESS CRITERIA

The product succeeds if a first-time merchant can:

### Within 10 minutes:

Create an account.

Create a store.

Add a product.

Add a WhatsApp number.

Add a payment method.

Publish the store.

Open the store on their phone.

Place a test order.

Receive the order through WhatsApp.

Understand the order inside the dashboard.

If this cannot happen easily, simplify the product.

---

# 89. FINAL PRODUCT PHILOSOPHY

Do not build "another Shopify clone."

Build:

> **The easiest way for a business to start selling online.**

Shopify should be the reference for capability.

But simplicity should be the reference for UX.

The product should feel like:

**Create → Add Products → Publish → Sell.**

Not:

**Configure → Customize → Install → Configure → Integrate → Learn → Sell.**

Every screen, feature, database decision, API, and component should support that philosophy.

---

# 90. FINAL INSTRUCTION TO THE AI AGENT

You are responsible for building this product carefully.

Before implementing any feature:

1. Inspect the existing project.
2. Understand its architecture.
3. Identify reusable components.
4. Identify affected modules.
5. Identify required database changes.
6. Identify security implications.
7. Implement the smallest correct solution.
8. Test it.
9. Fix errors.
10. Verify that existing functionality still works.
11. Document important architectural decisions.
12. Only then continue.

Never sacrifice simplicity for unnecessary complexity.

Never sacrifice security for convenience.

Never sacrifice maintainability for speed.

Never introduce a feature simply because Shopify has it.

Every feature must justify its existence.

The ultimate goal is:

# ANY BUSINESS → CREATE STORE → ADD PRODUCTS → ACCEPT ORDERS → GET PAID.

Make ecommerce simple.