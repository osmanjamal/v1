this.getCartContents();
          this.openCart();
        }.bind(this))
        .catch(function(error) {
          console.error(error);
        })
        .finally(function() {
          submitButton.classList.remove(this.classes.loading);
        }.bind(this));
      },
      
      handleQuickAddToCart: function(evt) {
        evt.preventDefault();
        
        var button = evt.currentTarget;
        var productId = button.getAttribute('data-product-id');
        var variantId = button.getAttribute('data-variant-id');
        
        button.classList.add(this.classes.loading);
        
        var data = {
          id: variantId,
          quantity: 1
        };
        
        fetch('/cart/add.js', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify(data)
        })
        .then(function(response) {
          return response.json();
        })
        .then(function(data) {
          if (data.status) {
            // خطأ
            console.error(data);
            return;
          }
          
          this.getCartContents();
          this.openCart();
        }.bind(this))
        .catch(function(error) {
          console.error(error);
        })
        .finally(function() {
          button.classList.remove(this.classes.loading);
        }.bind(this));
      },
      
      getCartContents: function() {
        fetch('/cart.js', {
          credentials: 'same-origin',
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        .then(function(response) {
          return response.json();
        })
        .then(function(cart) {
          this.updateCartCount(cart.item_count);
          this.renderCartItems(cart);
          
          document.dispatchEvent(new CustomEvent('ajaxCart:updated', {
            detail: { cart: cart }
          }));
        }.bind(this))
        .catch(function(error) {
          console.error(error);
        });
      },
      
      updateCartCount: function(count) {
        this.cache.$cartCount.forEach(function(element) {
          element.textContent = count;
          
          if (count > 0) {
            element.classList.add('has-items');
          } else {
            element.classList.remove('has-items');
          }
        });
      },
      
      updateCartDrawer: function(evt) {
        if (!evt.detail || !evt.detail.cart) return;
        
        var cart = evt.detail.cart;
        
        if (this.cache.$cartSubtotal) {
          this.cache.$cartSubtotal.innerHTML = theme.utils.formatMoney(cart.total_price);
        }
        
        if (this.cache.$cartItemCount) {
          this.cache.$cartItemCount.textContent = cart.item_count;
        }
      },
      
      renderCartItems: function(cart) {
        if (!this.cache.$cartItems) return;
        
        if (cart.item_count === 0) {
          this.cache.$cartItems.innerHTML = '<div class="cart-drawer__empty">' +
            '<h2 class="cart-drawer__empty-title">سلة التسوق فارغة</h2>' +
            '<p class="cart-drawer__empty-text">لم تقم بإضافة أي منتجات إلى سلة التسوق.</p>' +
            '<p><a href="/collections/all" class="btn btn--primary">تسوق الآن</a></p>' +
            '</div>';
          return;
        }
        
        var items = [];
        
        cart.items.forEach(function(item) {
          var image = item.image ? item.image.replace(/(\.[^.]*)$/, "_100x$1") : '';
          
          var itemHtml = '<div class="cart-item" data-line-item-key="' + item.key + '" data-variant-id="' + item.variant_id + '">' +
            '<div class="cart-item__image">' +
            (image ? '<img src="' + image + '" alt="' + item.title + '">' : '') +
            '</div>' +
            '<div class="cart-item__content">' +
            '<h3 class="cart-item__title">' +
            '<a href="' + item.url + '">' + item.title + '</a>' +
            '</h3>';
          
          if (item.variant_title && item.variant_title !== 'Default Title') {
            itemHtml += '<div class="cart-item__variant">' + item.variant_title + '</div>';
          }
          
          itemHtml += '<div class="cart-item__price">' + theme.utils.formatMoney(item.line_price) + '</div>' +
            '<div class="cart-item__quantity">' +
            '<div class="quantity-input">' +
            '<button type="button" class="quantity-input__button quantity-input__button--minus" data-cart-change="minus" data-key="' + item.key + '" aria-label="تقليل الكمية">' +
            '<span class="icon-minus" aria-hidden="true"></span>' +
            '</button>' +
            '<input type="number" name="updates[]" value="' + item.quantity + '" min="0" aria-label="الكمية" data-key="' + item.key + '" class="quantity-input__field">' +
            '<button type="button" class="quantity-input__button quantity-input__button--plus" data-cart-change="plus" data-key="' + item.key + '" aria-label="زيادة الكمية">' +
            '<span class="icon-plus" aria-hidden="true"></span>' +
            '</button>' +
            '</div>' +
            '<button type="button" class="cart-item__remove" data-cart-remove data-key="' + item.key + '">إزالة</button>' +
            '</div>' +
            '</div>' +
            '</div>';
          
          items.push(itemHtml);
        });
        
        this.cache.$cartItems.innerHTML = items.join('');
        
        // Attach event listeners for quantity buttons
        var quantityButtons = this.cache.$cartItems.querySelectorAll('.quantity-input__button');
        quantityButtons.forEach(function(button) {
          button.addEventListener('click', this.handleQuantityChange.bind(this));
        }.bind(this));
        
        // Attach event listeners for remove buttons
        var removeButtons = this.cache.$cartItems.querySelectorAll('[data-cart-remove]');
        removeButtons.forEach(function(button) {
          button.addEventListener('click', this.handleItemRemove.bind(this));
        }.bind(this));
      },
      
      handleQuantityChange: function(evt) {
        var button = evt.currentTarget;
        var key = button.getAttribute('data-key');
        var action = button.getAttribute('data-cart-change');
        var input = button.parentNode.querySelector('input');
        var currentQty = parseInt(input.value, 10);
        var newQty = currentQty;
        
        if (action === 'plus') {
          newQty = currentQty + 1;
        } else if (action === 'minus') {
          newQty = currentQty - 1;
          if (newQty < 0) newQty = 0;
        }
        
        if (newQty === currentQty) return;
        
        this.updateCartItem(key, newQty);
      },
      
      handleItemRemove: function(evt) {
        var button = evt.currentTarget;
        var key = button.getAttribute('data-key');
        
        this.updateCartItem(key, 0);
      },
      
      updateCartItem: function(key, quantity) {
        var data = {
          updates: {}
        };
        data.updates[key] = quantity;
        
        fetch('/cart/update.js', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify(data)
        })
        .then(function(response) {
          return response.json();
        })
        .then(function(cart) {
          this.updateCartCount(cart.item_count);
          this.renderCartItems(cart);
          
          document.dispatchEvent(new CustomEvent('ajaxCart:updated', {
            detail: { cart: cart }
          }));
        }.bind(this))
        .catch(function(error) {
          console.error(error);
        });
      }
    },
    
    // صفحة المنتج
    productPage: {
      selectors: {
        addToCartForm: 'form[action="/cart/add"]',
        productJson: '[data-product-json]',
        productPrice: '[data-product-price]',
        comparePrice: '[data-compare-price]',
        optionSelector: '[data-option-selector]',
        optionValue: '[data-option-value]',
        optionSelectedValue: '[data-option-selected-value]',
        singleOptionSelector: '[data-single-option-selector]',
        variantSelector: '[data-product-select]',
        inventoryStatus: '[data-inventory-status]',
        productSku: '[data-product-sku]'
      },
      
      init: function() {
        this.cache = {};
        this.cacheSelectors();
        
        if (Object.keys(this.cache).length === 0 || !this.cache.$addToCartForm) return;
        
        this.initProductVariants();
        this.bindEvents();
      },
      
      cacheSelectors: function() {
        this.cache = {
          $addToCartForm: document.querySelector(this.selectors.addToCartForm),
          $productJson: document.querySelector(this.selectors.productJson),
          $productPrice: document.querySelector(this.selectors.productPrice),
          $comparePrice: document.querySelector(this.selectors.comparePrice),
          $optionSelectors: document.querySelectorAll(this.selectors.optionSelector),
          $optionValues: document.querySelectorAll(this.selectors.optionValue),
          $optionSelectedValues: document.querySelectorAll(this.selectors.optionSelectedValue),
          $singleOptionSelectors: document.querySelectorAll(this.selectors.singleOptionSelector),
          $variantSelector: document.querySelector(this.selectors.variantSelector),
          $inventoryStatus: document.querySelector(this.selectors.inventoryStatus),
          $productSku: document.querySelector(this.selectors.productSku)
        };
      },
      
      initProductVariants: function() {
        if (!this.cache.$productJson) return;
        
        try {
          this.productSingleObject = JSON.parse(this.cache.$productJson.innerHTML);
          this.productVariants = this.productSingleObject.variants;
        } catch (e) {
          console.error('Error parsing product JSON: ', e);
          return;
        }
        
        // Set initial variant
        if (this.cache.$variantSelector) {
          var initialVariantId = this.cache.$variantSelector.value;
          var initialVariant = this.productVariants.find(function(variant) {
            return variant.id === parseInt(initialVariantId, 10);
          });
          
          if (initialVariant) {
            this.currentVariant = initialVariant;
            this.updateProductState(initialVariant);
          }
        }
      },
      
      bindEvents: function() {
        // Radio buttons or color swatches
        this.cache.$optionValues.forEach(function(element) {
          element.addEventListener('click', this.onOptionValueClick.bind(this));
        }.bind(this));
        
        // Dropdowns
        this.cache.$singleOptionSelectors.forEach(function(element) {
          element.addEventListener('change', this.onSingleOptionChange.bind(this));
        }.bind(this));
      },
      
      onOptionValueClick: function(evt) {
        var element = evt.currentTarget;
        var value = element.getAttribute('data-option-value');
        var index = parseInt(element.closest('[data-option-index]').getAttribute('data-option-index'), 10);
        
        // Update the hidden input's value
        var selector = this.cache.$singleOptionSelectors[index];
        if (selector) {
          selector.value = value;
          selector.dispatchEvent(new Event('change'));
        }
        
        // Update active state on option
        var optionElements = element.closest('[data-option-selector]').querySelectorAll('[data-option-value]');
        optionElements.forEach(function(el) {
          el.classList.remove('is-active');
        });
        element.classList.add('is-active');
        
        // Update selected value
        var selectedValueElement = this.cache.$optionSelectedValues[index];
        if (selectedValueElement) {
          selectedValueElement.textContent = value;
        }
      },
      
      onSingleOptionChange: function() {
        var selectedOptions = [];
        
        this.cache.$singleOptionSelectors.forEach(function(selector) {
          selectedOptions.push(selector.value);
        });
        
        var selectedVariant = this.productVariants.find(function(variant) {
          return variant.options.every(function(option, index) {
            return option === selectedOptions[index];
          });
        });
        
        if (selectedVariant) {
          this.currentVariant = selectedVariant;
          this.updateProductState(selectedVariant);
          this.updateVariantInput(selectedVariant);
        }
      },
      
      updateProductState: function(variant) {
        // Update prices
        if (this.cache.$productPrice) {
          this.cache.$productPrice.innerHTML = theme.utils.formatMoney(variant.price);
        }
        
        if (this.cache.$comparePrice) {
          if (variant.compare_at_price > variant.price) {
            this.cache.$comparePrice.innerHTML = theme.utils.formatMoney(variant.compare_at_price);
            this.cache.$comparePrice.style.display = '';
          } else {
            this.cache.$comparePrice.style.display = 'none';
          }
        }
        
        // Update SKU
        if (this.cache.$productSku && variant.sku) {
          this.cache.$productSku.textContent = variant.sku;
        }
        
        // Update inventory status
        if (this.cache.$inventoryStatus) {
          if (variant.available) {
            this.cache.$inventoryStatus.textContent = 'متوفر';
            this.cache.$inventoryStatus.classList.add('is-available');
            this.cache.$inventoryStatus.classList.remove('is-unavailable');
          } else {
            this.cache.$inventoryStatus.textContent = 'نفدت الكمية';
            this.cache.$inventoryStatus.classList.remove('is-available');
            this.cache.$inventoryStatus.classList.add('is-unavailable');
          }
        }
        
        // Update add to cart button state
        var addToCartButton = this.cache.$addToCartForm.querySelector('[data-add-to-cart]');
        if (addToCartButton) {
          if (variant.available) {
            addToCartButton.disabled = false;
            addToCartButton.classList.remove('btn--disabled');
            addToCartButton.querySelector('.btn__text').textContent = 'إضافة إلى السلة';
          } else {
            addToCartButton.disabled = true;
            addToCartButton.classList.add('btn--disabled');
            addToCartButton.querySelector('.btn__text').textContent = 'نفدت الكمية';
          }
        }
        
        // Update URL with variant ID if browser supports history API
        if (history.replaceState) {
          var url = window.location.href.split('?')[0];
          history.replaceState({ variantId: variant.id }, null, url + '?variant=' + variant.id);
        }
      },
      
      updateVariantInput: function(variant) {
        if (this.cache.$variantSelector) {
          this.cache.$variantSelector.value = variant.id;
        }
      }
    },
    
    // مدخلات الكمية
    quantityInput: {
      selectors: {
        container: '.quantity-input',
        input: '.quantity-input__field',
        minusButton: '.quantity-input__button--minus',
        plusButton: '.quantity-input__button--plus'
      },
      
      init: function() {
        this.containers = document.querySelectorAll(this.selectors.container);
        
        if (this.containers.length === 0) return;
        
        this.containers.forEach(function(container) {
          this.bindEventsOnQuantityControl(container);
        }.bind(this));
      },
      
      bindEventsOnQuantityControl: function(container) {
        var minusButton = container.querySelector(this.selectors.minusButton);
        var plusButton = container.querySelector(this.selectors.plusButton);
        var input = container.querySelector(this.selectors.input);
        
        if (minusButton) {
          minusButton.addEventListener('click', function() {
            this.changeQuantity(input, -1);
          }.bind(this));
        }
        
        if (plusButton) {
          plusButton.addEventListener('click', function() {
            this.changeQuantity(input, 1);
          }.bind(this));
        }
        
        if (input) {
          input.addEventListener('change', function() {
            this.validateQuantity(input);
          }.bind(this));
        }
      },
      
      changeQuantity: function(input, change) {
        var currentValue = parseInt(input.value, 10) || 1;
        var newValue = currentValue + change;
        var minValue = parseInt(input.getAttribute('min'), 10) || 1;
        
        if (newValue < minValue) {
          newValue = minValue;
        }
        
        input.value = newValue;
        input.dispatchEvent(new Event('change'));
      },
      
      validateQuantity: function(input) {
        var value = parseInt(input.value, 10);
        var minValue = parseInt(input.getAttribute('min'), 10) || 1;
        
        if (isNaN(value) || value < minValue) {
          input.value = minValue;
        }
      }
    },
    
    // صفحة المجموعة
    collectionPage: {
      selectors: {
        filterToggle: '[data-collection-filters-toggle]',
        filterContainer: '.collection-filters',
        filterClose: '[data-collection-filters-close]',
        sortBy: '#SortBy',
        collectionView: '[data-collection-view]',
        collectionViewButton: '.collection-view__button',
        filterToggleButton: '[data-toggle-filter]'
      },
      
      classes: {
        active: 'is-active'
      },
      
      init: function() {
        this.cache = {};
        this.cacheSelectors();
        this.bindEvents();
      },
      
      cacheSelectors: function() {
        this.cache = {
          $filterToggle: document.querySelector(this.selectors.filterToggle),
          $filterContainer: document.querySelector(this.selectors.filterContainer),
          $filterClose: document.querySelector(this.selectors.filterClose),
          $sortBy: document.querySelector(this.selectors.sortBy),
          $collectionView: document.querySelector(this.selectors.collectionView),
          $collectionViewButtons: document.querySelectorAll(this.selectors.collectionViewButton),
          $filterToggleButtons: document.querySelectorAll(this.selectors.filterToggleButton)
        };
      },
      
      bindEvents: function() {
        if (this.cache.$filterToggle) {
          this.cache.$filterToggle.addEventListener('click', this.openFilters.bind(this));
        }
        
        if (this.cache.$filterClose) {
          this.cache.$filterClose.addEventListener('click', this.closeFilters.bind(this));
        }
        
        if (this.cache.$sortBy) {
          this.cache.$sortBy.addEventListener('change', this.handleSortChange.bind(this));
        }
        
        if (this.cache.$collectionViewButtons.length > 0) {
          this.cache.$collectionViewButtons.forEach(function(button) {
            button.addEventListener('click', this.handleViewChange.bind(this));
          }.bind(this));
        }
        
        if (this.cache.$filterToggleButtons.length > 0) {
          this.cache.$filterToggleButtons.forEach(function(button) {
            button.addEventListener('click', this.toggleFilter.bind(this));
          }.bind(this));
        }
      },
      
      openFilters: function() {
        document.querySelector('.collection-sidebar').classList.add(this.classes.active);
        document.body.style.overflow = 'hidden';
      },
      
      closeFilters: function() {
        document.querySelector('.collection-sidebar').classList.remove(this.classes.active);
        document.body.style.overflow = '';
      },
      
      handleSortChange: function(evt) {
        var value = evt.currentTarget.value;
        window.location.href = this.updateQueryStringParameter(window.location.href, 'sort_by', value);
      },
      
      handleViewChange: function(evt) {
        evt.preventDefault();
        
        var button = evt.currentTarget;
        var view = button.getAttribute('data-view');
        
        // Update button states
        this.cache.$collectionViewButtons.forEach(function(btn) {
          btn.classList.remove(this.classes.active);
        }.bind(this));
        button.classList.add(this.classes.active);
        
        // Update collection grid
        var collectionGrid = document.querySelector('.collection-grid');
        if (collectionGrid) {
          if (view === 'grid') {
            collectionGrid.classList.remove('collection-grid--list');
          } else if (view === 'list') {
            collectionGrid.classList.add('collection-grid--list');
          }
        }
      },
      
      toggleFilter: function(evt) {
        var button = evt.currentTarget;
        var content = button.parentNode.nextElementSibling;
        var isExpanded = button.getAttribute('aria-expanded') === 'true';
        
        button.setAttribute('aria-expanded', !isExpanded);
        content.setAttribute('aria-hidden', isExpanded);
        
        if (isExpanded) {
          content.style.display = 'none';
        } else {
          content.style.display = 'block';
        }
      },
      
      updateQueryStringParameter: function(uri, key, value) {
        var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
        var separator = uri.indexOf('?') !== -1 ? "&" : "?";
        
        if (uri.match(re)) {
          return uri.replace(re, '$1' + key + "=" + value + '$2');
        } else {
          return uri + separator + key + "=" + value;
        }
      }
    },
    
    // معرض صور المنتج
    productGallery: {
      selectors: {
        gallery: '.product-gallery',
        mainImage: '.product-gallery__main',
        thumbnails: '.product-gallery__thumbnail',
        navButton: '.product-gallery__nav-button',
        slides: '.product-gallery__slide',
        zoomImage: '[data-zoom-src]'
      },
      
      classes: {
        active: 'is-active'
      },
      
      init: function() {
        this.galleries = document.querySelectorAll(this.selectors.gallery);
        
        if (this.galleries.length === 0) return;
        
        this.galleries.forEach(function(gallery) {
          this.initGallery(gallery);
        }.bind(this));
      },
      
      initGallery: function(gallery) {
        var galleryType = gallery.classList.contains('product-gallery--slider') ? 'slider' :
                           gallery.classList.contains('product-gallery--thumbnails') ? 'thumbnails' : 'stacked';
        
        switch (galleryType) {
          case 'slider':
            this.initSlider(gallery);
            break;
          case 'thumbnails':
            this.initThumbnails(gallery);
            break;
          case 'stacked':
            this.initZoom(gallery);
            break;
        }
      },
      
      initSlider: function(gallery) {
        var mainContainer = gallery.querySelector(this.selectors.mainImage);
        var navButtons = gallery.querySelectorAll(this.selectors.navButton);
        var paginationContainer = gallery.querySelector('.product-gallery__pagination');
        
        // Initialize Flickity slider
        var flkty = theme.utils.enableSlider(mainContainer, {
          prevNextButtons: false,
          pageDots: false,
          wrapAround: true,
          adaptiveHeight: true
        });
        
        if (!flkty) return;
        
        // Create pagination dots
        if (paginationContainer) {
          var slides = gallery.querySelectorAll(this.selectors.slides);
          var dots = '';
          
          for (var i = 0; i < slides.length; i++) {
            dots += '<span class="dot' + (i === 0 ? ' is-active' : '') + '" data-slide-index="' + i + '"></span>';
          }
          
          paginationContainer.innerHTML = dots;
          
          // Add click event to pagination dots
          var dotElements = paginationContainer.querySelectorAll('.dot');
          dotElements.forEach(function(dot) {
            dot.addEventListener('click', function() {
              var index = parseInt(this.getAttribute('data-slide-index'), 10);
              flkty.select(index);
            });
          });
          
          // Update dots on slide change
          flkty.on('select', function() {
            var index = flkty.selectedIndex;
            dotElements.forEach(function(dot, i) {
              dot.classList.toggle('is-active', i === index);
            });
          });
        }
        
        // Add click events to prev/next buttons
        navButtons.forEach(function(button) {
          button.addEventListener('click', function() {
            if (this.classList.contains('product-gallery__nav-button--prev')) {
              flkty.previous();
            } else {
              flkty.next();
            }
          });
        });
        
        // Initialize zoom
        this.initZoom(gallery);
      },
      
      initThumbnails: function(gallery) {
        var thumbnails = gallery.querySelectorAll(this.selectors.thumbnails);
        var mainContainer = gallery.querySelector(this.selectors.mainImage);
        
        thumbnails.forEach(function(thumbnail) {
          thumbnail.addEventListener('click', function() {
            var mediaId = this.getAttribute('data-thumbnail-id');
            var mainImage = mainContainer.querySelector('[data-media-id="' + mediaId + '"]');
            
            if (!mainImage) return;
            
            // Hide all images
            var allImages = mainContainer.querySelectorAll('[data-media-id]');
            allImages.forEach(function(image) {
              image.style.display = 'none';
            });
            
            // Show selected image
            mainImage.style.display = 'block';
            
            // Update active state on thumbnails
            thumbnails.forEach(function(thumb) {
              thumb.classList.remove(this.classes.active);
            }.bind(this));
            
            this.classList.add(this.classes.active);
          });
        }.bind(this));
        
        // Initialize zoom
        this.initZoom(gallery);
      },
      
      initZoom: function(gallery) {
        var zoomImages = gallery.querySelectorAll(this.selectors.zoomImage);
        
        if (zoomImages.length === 0) return;
        
        // Simple lightbox zoom
        zoomImages.forEach(function(image) {
          image.addEventListener('click', function() {
            var zoomSrc = this.getAttribute('data-zoom-src');
            if (!zoomSrc) return;
            
            var lightbox = document.createElement('div');
            lightbox.className = 'product-gallery-lightbox';
            lightbox.innerHTML = '<div class="product-gallery-lightbox__container">' +
              '<img src="' + zoomSrc + '" alt="">' +
              '<button class="product-gallery-lightbox__close">&times;</button>' +
              '</div>';
            
            document.body.appendChild(lightbox);
            document.body.style.overflow = 'hidden';
            
            lightbox.addEventListener('click', function(evt) {
              if (evt.target === lightbox || evt.target.classList.contains('product-gallery-lightbox__close')) {
                document.body.removeChild(lightbox);
                document.body.style.overflow = '';
              }
            });
          });
        });
      }
    },
    
    // النشرة الإخبارية المنبثقة
    newsletterPopup: {
      selectors: {
        popup: '.newsletter-popup',
        close: '.newsletter-popup__close'
      },
      
      classes: {
        active: 'is-active'
      },
      
      init: function() {
        this.popup = document.querySelector(this.selectors.popup);
        
        if (!this.popup) return;
        
        this.closeButton = this.popup.querySelector(this.selectors.close);
        
        this.bindEvents();
        this.checkCookie();
      },
      
      bindEvents: function() {
        this.closeButton.addEventListener('click', this.close.bind(this));
        
        this.popup.addEventListener('click', function(evt) {
          if (evt.target === this.popup) {
            this.close();
          }
        }.bind(this));
      },
      
      checkCookie: function() {
        // Check if user has already closed the popup
        if (localStorage.getItem('newsletter_popup_closed')) {
          var closedTimestamp = parseInt(localStorage.getItem('newsletter_popup_closed'), 10);
          var now = new Date().getTime();
          var daysSinceClosed = Math.floor((now - closedTimestamp) / (1000 * 60 * 60 * 24));
          
          // Show popup again after 30 days
          if (daysSinceClosed >= 30) {
            localStorage.removeItem('newsletter_popup_closed');
            this.show();
          }
        } else {
          // Show popup after 5 seconds for new visitors
          setTimeout(this.show.bind(this), 5000);
        }
      },
      
      show: function() {
        this.popup.classList.add(this.classes/*================ وظائف الثيم ================*/

// إعداد العناصر الأساسية عند تحميل المستند
document.addEventListener('DOMContentLoaded', function() {
  var theme = window.theme || {};
  
  // تكوين الثيم
  theme = {
    // المتغيرات
    breakpoints: {
      small: 576,
      medium: 768,
      large: 992,
      xlarge: 1200
    },
    
    // تهيئة كافة الوظائف
    init: function() {
      theme.mobileMenu.init();
      theme.header.init();
      theme.cart.init();
      theme.productPage.init();
      theme.quantityInput.init();
      theme.collectionPage.init();
      theme.productGallery.init();
      theme.newsletterPopup.init();
      theme.quickView.init();
      theme.accordions.init();
      theme.tabs.init();
      theme.scrollToTop.init();
      theme.stickyElements.init();
    },
    
    // الوظائف المساعدة العامة
    utils: {
      // تمكين الكاروسل للعناصر
      enableSlider: function(container, options) {
        if (typeof Flickity === 'undefined') {
          return false;
        }
        
        options = options || {};
        
        var defaults = {
          cellAlign: 'left',
          contain: true,
          pageDots: true,
          prevNextButtons: true,
          adaptiveHeight: false,
          watchCSS: false,
          wrapAround: false
        };
        
        var config = Object.assign({}, defaults, options);
        
        return new Flickity(container, config);
      },
      
      // تقديم مبلغ المال بتنسيق العملة
      formatMoney: function(cents, format) {
        if (typeof cents === 'string') {
          cents = cents.replace('.', '');
        }
        
        var value = '';
        var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
        var formatString = format || window.theme.moneyFormat;
        
        function formatWithDelimiters(number, precision, thousands, decimal) {
          precision = precision || 2;
          thousands = thousands || ',';
          decimal = decimal || '.';
          
          if (isNaN(number) || number === null) {
            return 0;
          }
          
          number = (number / 100.0).toFixed(precision);
          
          var parts = number.split('.');
          var dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
          var centsAmount = parts[1] ? (decimal + parts[1]) : '';
          
          return dollarsAmount + centsAmount;
        }
        
        switch (formatString.match(placeholderRegex)[1]) {
          case 'amount':
            value = formatWithDelimiters(cents, 2);
            break;
          case 'amount_no_decimals':
            value = formatWithDelimiters(cents, 0);
            break;
          case 'amount_with_comma_separator':
            value = formatWithDelimiters(cents, 2, '.', ',');
            break;
          case 'amount_no_decimals_with_comma_separator':
            value = formatWithDelimiters(cents, 0, '.', ',');
            break;
          case 'amount_with_space_separator':
            value = formatWithDelimiters(cents, 2, ' ', ',');
            break;
        }
        
        return formatString.replace(placeholderRegex, value);
      },
      
      // تحقق مما إذا كان الجهاز محمولًا
      isMobile: function() {
        return window.innerWidth < theme.breakpoints.medium;
      },
      
      // تحقق مما إذا كان الجهاز لوحيًا
      isTablet: function() {
        return window.innerWidth >= theme.breakpoints.medium && window.innerWidth < theme.breakpoints.large;
      },
      
      // تحقق مما إذا كان الجهاز حاسوبًا
      isDesktop: function() {
        return window.innerWidth >= theme.breakpoints.large;
      },
      
      // الحصول على عرض العنصر
      getWidth: function(element) {
        if (!element) return 0;
        
        return Math.max(
          element.scrollWidth,
          element.offsetWidth,
          element.clientWidth
        );
      },
      
      // استدعاء وظيفة مرة واحدة بعد انتهاء حدث التمدد/التقليص
      debounce: function(func, wait, immediate) {
        var timeout;
        return function() {
          var context = this, args = arguments;
          var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
          };
          var callNow = immediate && !timeout;
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
          if (callNow) func.apply(context, args);
        };
      },
      
      // تحميل سكربت خارجي
      loadScript: function(src, callback) {
        var script = document.createElement('script');
        script.src = src;
        script.onload = callback || function() {};
        document.head.appendChild(script);
      }
    },
    
    // القائمة المتنقلة للهواتف
    mobileMenu: {
      selectors: {
        mobileMenuToggle: '.mobile-menu-toggle',
        mobileMenu: '.mobile-menu',
        mobileMenuContainer: '.mobile-menu__container',
        mobileMenuClose: '.mobile-menu__close',
        mobileMenuDropdownToggle: '.mobile-menu__dropdown-toggle'
      },
      
      classes: {
        active: 'is-active'
      },
      
      init: function() {
        this.cache = {};
        this.cacheSelectors();
        this.bindEvents();
      },
      
      cacheSelectors: function() {
        this.cache = {
          $mobileMenuToggle: document.querySelectorAll(this.selectors.mobileMenuToggle),
          $mobileMenu: document.querySelector(this.selectors.mobileMenu),
          $mobileMenuContainer: document.querySelector(this.selectors.mobileMenuContainer),
          $mobileMenuClose: document.querySelector(this.selectors.mobileMenuClose),
          $mobileMenuDropdownToggles: document.querySelectorAll(this.selectors.mobileMenuDropdownToggle)
        };
      },
      
      bindEvents: function() {
        if (!this.cache.$mobileMenu) return;
        
        this.cache.$mobileMenuToggle.forEach(function(toggle) {
          toggle.addEventListener('click', this.openMobileMenu.bind(this));
        }.bind(this));
        
        this.cache.$mobileMenuClose.addEventListener('click', this.closeMobileMenu.bind(this));
        
        this.cache.$mobileMenu.addEventListener('click', function(evt) {
          if (evt.target === this.cache.$mobileMenu) {
            this.closeMobileMenu();
          }
        }.bind(this));
        
        this.cache.$mobileMenuDropdownToggles.forEach(function(toggle) {
          toggle.addEventListener('click', this.toggleMobileMenuDropdown.bind(this));
        }.bind(this));
      },
      
      openMobileMenu: function() {
        this.cache.$mobileMenu.classList.add(this.classes.active);
        document.body.style.overflow = 'hidden';
      },
      
      closeMobileMenu: function() {
        this.cache.$mobileMenu.classList.remove(this.classes.active);
        document.body.style.overflow = '';
      },
      
      toggleMobileMenuDropdown: function(evt) {
        var toggle = evt.currentTarget;
        var dropdown = toggle.nextElementSibling;
        
        toggle.classList.toggle(this.classes.active);
        dropdown.classList.toggle(this.classes.active);
        
        var isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !isExpanded);
      }
    },
    
    // رأس الصفحة
    header: {
      selectors: {
        header: '.site-header',
        searchToggle: '.search-toggle',
        searchContainer: '.site-header__search-container',
        searchForm: '.search-form',
        searchClose: '.search-form__close'
      },
      
      classes: {
        sticky: 'site-header--sticky',
        hidden: 'site-header--hidden',
        transparent: 'site-header--transparent'
      },
      
      init: function() {
        this.cache = {};
        this.cacheSelectors();
        this.bindEvents();
        this.stickyHeader();
      },
      
      cacheSelectors: function() {
        this.cache = {
          $header: document.querySelector(this.selectors.header),
          $searchToggle: document.querySelector(this.selectors.searchToggle),
          $searchContainer: document.querySelector(this.selectors.searchContainer),
          $searchForm: document.querySelector(this.selectors.searchForm),
          $searchClose: document.querySelector(this.selectors.searchClose)
        };
      },
      
      bindEvents: function() {
        if (!this.cache.$header) return;
        
        if (this.cache.$searchToggle) {
          this.cache.$searchToggle.addEventListener('click', this.toggleSearch.bind(this));
        }
        
        if (this.cache.$searchClose) {
          this.cache.$searchClose.addEventListener('click', this.closeSearch.bind(this));
        }
        
        window.addEventListener('scroll', theme.utils.debounce(this.stickyHeader.bind(this), 15));
        window.addEventListener('resize', theme.utils.debounce(this.stickyHeader.bind(this), 150));
      },
      
      toggleSearch: function(evt) {
        evt.preventDefault();
        
        var isHidden = this.cache.$searchContainer.hasAttribute('hidden');
        
        if (isHidden) {
          this.openSearch();
        } else {
          this.closeSearch();
        }
      },
      
      openSearch: function() {
        this.cache.$searchContainer.removeAttribute('hidden');
        this.cache.$searchToggle.setAttribute('aria-expanded', 'true');
        setTimeout(function() {
          this.cache.$searchForm.querySelector('input[type="search"]').focus();
        }.bind(this), 100);
      },
      
      closeSearch: function() {
        this.cache.$searchContainer.setAttribute('hidden', '');
        this.cache.$searchToggle.setAttribute('aria-expanded', 'false');
        this.cache.$searchToggle.focus();
      },
      
      stickyHeader: function() {
        if (!this.cache.$header || !this.cache.$header.classList.contains(this.classes.sticky)) return;
        
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        var headerHeight = this.cache.$header.offsetHeight;
        
        if (scrollTop > this.lastScrollTop && scrollTop > headerHeight) {
          // تمرير لأسفل
          this.cache.$header.classList.add(this.classes.hidden);
        } else {
          // تمرير لأعلى
          this.cache.$header.classList.remove(this.classes.hidden);
        }
        
        this.lastScrollTop = scrollTop;
      }
    },
    
    // عربة التسوق
    cart: {
      selectors: {
        cartToggle: '.js-cart-trigger',
        cartDrawer: '.cart-drawer',
        cartDrawerContainer: '.cart-drawer__container',
        cartDrawerClose: '.cart-drawer__close',
        cartCount: '[data-cart-count]',
        cartSubtotal: '[data-cart-subtotal]',
        cartItems: '[data-cart-items]',
        cartItemCount: '[data-cart-item-count]',
        cartDrawerTemplate: '[data-cart-drawer-template]',
        addToCart: '[data-add-to-cart]',
        quickAddToCart: '.js-quick-add-to-cart'
      },
      
      classes: {
        active: 'is-active',
        loading: 'is-loading'
      },
      
      init: function() {
        this.cache = {};
        this.cacheSelectors();
        this.bindEvents();
      },
      
      cacheSelectors: function() {
        this.cache = {
          $cartToggle: document.querySelectorAll(this.selectors.cartToggle),
          $cartDrawer: document.querySelector(this.selectors.cartDrawer),
          $cartDrawerContainer: document.querySelector(this.selectors.cartDrawerContainer),
          $cartDrawerClose: document.querySelector(this.selectors.cartDrawerClose),
          $cartCount: document.querySelectorAll(this.selectors.cartCount),
          $cartSubtotal: document.querySelector(this.selectors.cartSubtotal),
          $cartItems: document.querySelector(this.selectors.cartItems),
          $cartItemCount: document.querySelector(this.selectors.cartItemCount),
          $addToCart: document.querySelector(this.selectors.addToCart),
          $quickAddToCart: document.querySelectorAll(this.selectors.quickAddToCart)
        };
      },
      
      bindEvents: function() {
        if (!this.cache.$cartDrawer) return;
        
        this.cache.$cartToggle.forEach(function(toggle) {
          toggle.addEventListener('click', this.toggleCart.bind(this));
        }.bind(this));
        
        this.cache.$cartDrawerClose.addEventListener('click', this.closeCart.bind(this));
        
        this.cache.$cartDrawer.addEventListener('click', function(evt) {
          if (evt.target === this.cache.$cartDrawer) {
            this.closeCart();
          }
        }.bind(this));
        
        if (this.cache.$addToCart) {
          this.cache.$addToCart.addEventListener('click', this.handleAddToCart.bind(this));
        }
        
        this.cache.$quickAddToCart.forEach(function(button) {
          button.addEventListener('click', this.handleQuickAddToCart.bind(this));
        }.bind(this));
        
        document.addEventListener('ajaxCart:updated', this.updateCartDrawer.bind(this));
      },
      
      toggleCart: function(evt) {
        evt.preventDefault();
        
        if (this.cache.$cartDrawer.classList.contains(this.classes.active)) {
          this.closeCart();
        } else {
          this.openCart();
        }
      },
      
      openCart: function() {
        this.cache.$cartDrawer.classList.add(this.classes.active);
        document.body.style.overflow = 'hidden';
        
        // تأخير قصير لضمان تنفيذ الانتقال بشكل صحيح
        setTimeout(function() {
          this.cache.$cartDrawerClose.focus();
        }.bind(this), 100);
      },
      
      closeCart: function() {
        this.cache.$cartDrawer.classList.remove(this.classes.active);
        document.body.style.overflow = '';
      },
      
      handleAddToCart: function(evt) {
        evt.preventDefault();
        
        var form = evt.target.closest('form');
        var submitButton = form.querySelector(this.selectors.addToCart);
        
        submitButton.classList.add(this.classes.loading);
        
        fetch('/cart/add.js', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: new URLSearchParams(new FormData(form))
        })
        .then(function(response) {
          return response.json();
        })
        .then(function(data) {
          if (data.status) {
            // خطأ
            console.error(data);
            return;
          }
          
          this.getCartContents();
          this.openCart();
        }.binshow: function() {
            this.popup.classList.add(this.classes.active);
          },
          
          close: function() {
            this.popup.classList.remove(this.classes.active);
            
            // Set cookie to avoid showing the popup again soon
            localStorage.setItem('newsletter_popup_closed', new Date().getTime());
          }
       }, 
         
        // العرض السريع للمنتج
        quickView: {
          selectors: {
            trigger: '.js-quick-view',
            modal: '.quick-view-modal',
            modalContent: '.quick-view-modal__content',
            close: '.quick-view-modal__close'
          },
          
          classes: {
            active: 'is-active',
            loading: 'is-loading'
          },
          
          init: function() {
            this.cache = {};
            this.cacheSelectors();
            this.bindEvents();
          },
          
          cacheSelectors: function() {
            this.cache = {
              $triggers: document.querySelectorAll(this.selectors.trigger),
              $modal: document.querySelector(this.selectors.modal),
              $modalContent: document.querySelector(this.selectors.modalContent),
              $close: document.querySelector(this.selectors.close)
            };
          },
          
          bindEvents: function() {
            if (this.cache.$triggers.length === 0 || !this.cache.$modal) return;
            
            this.cache.$triggers.forEach(function(trigger) {
              trigger.addEventListener('click', this.openQuickView.bind(this));
            }.bind(this));
            
            this.cache.$close.addEventListener('click', this.closeQuickView.bind(this));
            
            this.cache.$modal.addEventListener('click', function(evt) {
              if (evt.target === this.cache.$modal) {
                this.closeQuickView();
              }
            }.bind(this));
          },
          
          openQuickView: function(evt) {
            evt.preventDefault();
            
            var trigger = evt.currentTarget;
            var productHandle = trigger.getAttribute('data-product-handle');
            
            if (!productHandle) return;
            
            this.cache.$modal.classList.add(this.classes.active);
            this.cache.$modalContent.classList.add(this.classes.loading);
            document.body.style.overflow = 'hidden';
            
            this.loadProductContent(productHandle);
          },
          
          closeQuickView: function() {
            this.cache.$modal.classList.remove(this.classes.active);
            document.body.style.overflow = '';
            
            // Clear content after closing
            setTimeout(function() {
              this.cache.$modalContent.innerHTML = '';
            }.bind(this), 300);
          },
          
          loadProductContent: function(handle) {
            fetch('/products/' + handle + '?view=quick-view')
              .then(function(response) {
                return response.text();
              })
              .then(function(html) {
                this.cache.$modalContent.innerHTML = html;
                this.cache.$modalContent.classList.remove(this.classes.loading);
                
                // Initialize product functionality within the modal
                theme.productPage.init();
                theme.quantityInput.init();
                theme.productGallery.init();
              }.bind(this))
              .catch(function(error) {
                console.error('Error loading quick view:', error);
                this.cache.$modalContent.innerHTML = '<p class="error">حدث خطأ أثناء تحميل المنتج. يرجى المحاولة مرة أخرى.</p>';
                this.cache.$modalContent.classList.remove(this.classes.loading);
              }.bind(this));
          }
        },
        
        // الأكورديون
        accordions: {
          selectors: {
            accordion: '.accordion',
            trigger: '.accordion__trigger',
            content: '.accordion__content'
          },
          
          classes: {
            active: 'is-active'
          },
          
          init: function() {
            this.accordions = document.querySelectorAll(this.selectors.accordion);
            
            if (this.accordions.length === 0) return;
            
            this.accordions.forEach(function(accordion) {
              var triggers = accordion.querySelectorAll(this.selectors.trigger);
              
              triggers.forEach(function(trigger) {
                trigger.addEventListener('click', this.toggleAccordion.bind(this));
              }.bind(this));
            }.bind(this));
          },
          
          toggleAccordion: function(evt) {
            var trigger = evt.currentTarget;
            var content = trigger.nextElementSibling;
            var isExpanded = trigger.getAttribute('aria-expanded') === 'true';
            
            trigger.setAttribute('aria-expanded', !isExpanded);
            content.setAttribute('aria-hidden', isExpanded);
            
            if (isExpanded) {
              trigger.classList.remove(this.classes.active);
              content.style.maxHeight = null;
            } else {
              trigger.classList.add(this.classes.active);
              content.style.maxHeight = content.scrollHeight + 'px';
            }
          }
        },
        
        // التابات (Tabs)
        tabs: {
          selectors: {
            tabContainer: '[data-tabs]',
            tabTrigger: '[data-tab-trigger]',
            tabPanel: '[data-tab-panel]'
          },
          
          classes: {
            active: 'is-active'
          },
          
          init: function() {
            this.tabContainers = document.querySelectorAll(this.selectors.tabContainer);
            
            if (this.tabContainers.length === 0) return;
            
            this.tabContainers.forEach(function(container) {
              var triggers = container.querySelectorAll(this.selectors.tabTrigger);
              
              triggers.forEach(function(trigger) {
                trigger.addEventListener('click', this.switchTab.bind(this));
              }.bind(this));
            }.bind(this));
          },
          
          switchTab: function(evt) {
            var trigger = evt.currentTarget;
            var container = trigger.closest(this.selectors.tabContainer);
            var tabName = trigger.getAttribute('data-tab-trigger');
            
            // Update trigger states
            var triggers = container.querySelectorAll(this.selectors.tabTrigger);
            triggers.forEach(function(t) {
              t.classList.remove(this.classes.active);
              t.setAttribute('aria-selected', 'false');
            }.bind(this));
            
            trigger.classList.add(this.classes.active);
            trigger.setAttribute('aria-selected', 'true');
            
            // Update tab panel states
            var panels = container.querySelectorAll(this.selectors.tabPanel);
            panels.forEach(function(panel) {
              if (panel.getAttribute('data-tab-panel') === tabName) {
                panel.classList.add(this.classes.active);
                panel.removeAttribute('hidden');
              } else {
                panel.classList.remove(this.classes.active);
                panel.setAttribute('hidden', '');
              }
            }.bind(this));
          }
        },
        
        // زر الانتقال إلى الأعلى
        scrollToTop: {
          selectors: {
            button: '#back-to-top'
          },
          
          classes: {
            visible: 'is-visible'
          },
          
          init: function() {
            this.button = document.querySelector(this.selectors.button);
            
            if (!this.button) return;
            
            this.bindEvents();
          },
          
          bindEvents: function() {
            window.addEventListener('scroll', theme.utils.debounce(this.toggleButton.bind(this), 150));
            this.button.addEventListener('click', this.scrollToTop.bind(this));
          },
          
          toggleButton: function() {
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (scrollTop > 300) {
              this.button.classList.add(this.classes.visible);
            } else {
              this.button.classList.remove(this.classes.visible);
            }
          },
          
          scrollToTop: function(evt) {
            evt.preventDefault();
            
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          }
        },
        
        // العناصر الثابتة (Sticky Elements)
        stickyElements: {
          selectors: {
            sidebar: '[data-sticky-sidebar]'
          },
          
          init: function() {
            this.sidebar = document.querySelector(this.selectors.sidebar);
            
            if (!this.sidebar) return;
            
            this.stickyTop = this.sidebar.offsetTop;
            this.bindEvents();
          },
          
          bindEvents: function() {
            window.addEventListener('scroll', theme.utils.debounce(this.stickSidebar.bind(this), 15));
            window.addEventListener('resize', theme.utils.debounce(this.updateStickyPosition.bind(this), 150));
          },
          
          updateStickyPosition: function() {
            this.stickyTop = this.sidebar.offsetTop;
          },
          
          stickSidebar: function() {
            // Skip on mobile
            if (window.innerWidth < theme.breakpoints.large) return;
            
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            var headerHeight = document.querySelector('.site-header').offsetHeight;
            
            if (scrollTop > this.stickyTop - headerHeight) {
              this.sidebar.style.position = 'sticky';
              this.sidebar.style.top = headerHeight + 'px';
            } else {
              this.sidebar.style.position = '';
              this.sidebar.style.top = '';
            }
          }
        }
      };
      
      // Initialize everything
      theme.init();
      
      // Make theme object accessible globally
      window.theme = theme;
    });
    
    /*================ المكونات الإضافية ================*/
    
    // مكون التورق (Pagination)
    if (!customElements.get('pagination-component')) {
      class PaginationComponent extends HTMLElement {
        constructor() {
          super();
          this.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', this.handleClick.bind(this));
          });
        }
        
        handleClick(evt) {
          if (evt.currentTarget.href === window.location.href) {
            evt.preventDefault();
          }
        }
      }
      
      customElements.define('pagination-component', PaginationComponent);
    }
    
    // مكون الشوائر (Sliders)
    if (!customElements.get('slider-component')) {
      class SliderComponent extends HTMLElement {
        constructor() {
          super();
          this.slider = null;
          this.slides = this.querySelectorAll('.slider__slide');
          
          if (this.slides.length < 2) return;
          
          this.sliderContainer = this.querySelector('.slider__container');
          this.prevButton = this.querySelector('.slider__button--prev');
          this.nextButton = this.querySelector('.slider__button--next');
          this.paginationContainer = this.querySelector('.slider__pagination');
          
          this.initSlider();
        }
        
        initSlider() {
          if (typeof Flickity === 'undefined') return;
          
          const options = {
            draggable: true,
            wrapAround: true,
            cellAlign: 'left',
            prevNextButtons: false,
            pageDots: false,
            adaptiveHeight: this.hasAttribute('data-adaptive-height')
          };
          
          this.slider = new Flickity(this.sliderContainer, options);
          
          if (this.prevButton) {
            this.prevButton.addEventListener('click', () => this.slider.previous());
          }
          
          if (this.nextButton) {
            this.nextButton.addEventListener('click', () => this.slider.next());
          }
          
          if (this.paginationContainer) {
            this.createPagination();
          }
        }
        
        createPagination() {
          const dots = [];
          
          for (let i = 0; i < this.slides.length; i++) {
            const dot = document.createElement('button');
            dot.classList.add('slider__pagination-item');
            dot.setAttribute('aria-label', `الانتقال إلى الشريحة ${i + 1}`);
            dot.dataset.index = i;
            
            if (i === 0) {
              dot.classList.add('is-active');
            }
            
            dot.addEventListener('click', () => {
              this.slider.select(i);
            });
            
            dots.push(dot);
            this.paginationContainer.appendChild(dot);
          }
          
          this.dots = dots;
          
          this.slider.on('select', () => {
            const index = this.slider.selectedIndex;
            
            this.dots.forEach((dot, i) => {
              dot.classList.toggle('is-active', i === index);
            });
          });
        }
      }
      
      customElements.define('slider-component', SliderComponent);
    }
    
    // مكون القائمة المنسدلة للهواتف
    if (!customElements.get('mobile-navigation')) {
      class MobileNavigation extends HTMLElement {
        constructor() {
          super();
          this.overlay = this.querySelector('.mobile-menu__overlay');
          this.opener = document.querySelector('.mobile-menu-toggle');
          this.navigation = this.querySelector('.mobile-menu__navigation');
          this.closeButton = this.querySelector('.mobile-menu__close');
          this.dropdownToggles = this.querySelectorAll('.mobile-menu__dropdown-toggle');
          
          this.bindEvents();
        }
        
        bindEvents() {
          if (this.opener) {
            this.opener.addEventListener('click', this.openMobileNav.bind(this));
          }
          
          if (this.closeButton) {
            this.closeButton.addEventListener('click', this.closeMobileNav.bind(this));
          }
          
          if (this.overlay) {
            this.overlay.addEventListener('click', this.closeMobileNav.bind(this));
          }
          
          this.dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', this.toggleDropdown.bind(this));
          });
        }
        
        openMobileNav() {
          this.classList.add('is-active');
          document.body.style.overflow = 'hidden';
          this.closeButton.focus();
        }
        
        closeMobileNav() {
          this.classList.remove('is-active');
          document.body.style.overflow = '';
          this.opener.focus();
        }
        
        toggleDropdown(evt) {
          const toggle = evt.currentTarget;
          const dropdown = toggle.nextElementSibling;
          const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
          
          toggle.setAttribute('aria-expanded', !isExpanded);
          dropdown.style.display = isExpanded ? 'none' : 'block';
        }
      }
      
      customElements.define('mobile-navigation', MobileNavigation);
    }
    
    // مكون زر التبديل للكمية
    if (!customElements.get('quantity-toggle')) {
      class QuantityToggle extends HTMLElement {
        constructor() {
          super();
          this.input = this.querySelector('input');
          this.minusButton = this.querySelector('.quantity-input__button--minus');
          this.plusButton = this.querySelector('.quantity-input__button--plus');
          
          this.bindEvents();
        }
        
        bindEvents() {
          this.minusButton.addEventListener('click', () => this.changeQuantity(-1));
          this.plusButton.addEventListener('click', () => this.changeQuantity(1));
          this.input.addEventListener('change', () => this.validateQuantity());
        }
        
        changeQuantity(change) {
          const currentValue = parseInt(this.input.value, 10) || 1;
          const newValue = currentValue + change;
          const minValue = parseInt(this.input.getAttribute('min'), 10) || 1;
          
          if (newValue < minValue) {
            this.input.value = minValue;
          } else {
            this.input.value = newValue;
          }
          
          this.input.dispatchEvent(new Event('change'));
        }
        
        validateQuantity() {
          const value = parseInt(this.input.value, 10);
          const minValue = parseInt(this.input.getAttribute('min'), 10) || 1;
          
          if (isNaN(value) || value < minValue) {
            this.input.value = minValue;
          }
        }
      }
      
      customElements.define('quantity-toggle', QuantityToggle);
    }
    
    // مكون جدول المقاسات
    if (!customElements.get('size-chart')) {
      class SizeChart extends HTMLElement {
        constructor() {
          super();
          this.modal = this.querySelector('.size-chart-modal');
          this.openButton = document.querySelector('.js-size-chart-trigger');
          this.closeButton = this.querySelector('.size-chart-modal__close');
          
          if (!this.modal || !this.openButton) return;
          
          this.bindEvents();
        }
        
        bindEvents() {
          this.openButton.addEventListener('click', this.openModal.bind(this));
          
          if (this.closeButton) {
            this.closeButton.addEventListener('click', this.closeModal.bind(this));
          }
          
          this.modal.addEventListener('click', evt => {
            if (evt.target === this.modal) {
              this.closeModal();
            }
          });
        }
        
        openModal() {
          this.modal.classList.add('is-active');
          document.body.style.overflow = 'hidden';
          
          if (this.closeButton) {
            this.closeButton.focus();
          }
        }
        
        closeModal() {
          this.modal.classList.remove('is-active');
          document.body.style.overflow = '';
          this.openButton.focus();
        }
      }
      
      customElements.define('size-chart', SizeChart);
    }
    
    // مكون شريط البحث
    if (!customElements.get('search-bar')) {
      class SearchBar extends HTMLElement {
        constructor() {
          super();
          this.input = this.querySelector('input[type="search"]');
          this.predictiveSearchResults = this.querySelector('.predictive-search');
          this.isOpen = false;
          
          if (!this.input) return;
          
          this.setupEventListeners();
        }
        
        setupEventListeners() {
          this.input.addEventListener('input', this.debounce(evt => {
            this.onChange(evt);
          }, 300).bind(this));
          
          this.input.addEventListener('focus', this.onFocus.bind(this));
          
          document.addEventListener('click', this.onBodyClick.bind(this));
          
          this.addEventListener('keyup', this.onKeyup.bind(this));
        }
        
        onChange() {
          const searchTerm = this.input.value.trim();
          
          if (searchTerm.length === 0) {
            this.close();
            return;
          }
          
          this.fetchPredictiveSearch(searchTerm);
        }
        
        onFocus() {
          const searchTerm = this.input.value.trim();
          
          if (searchTerm.length > 0) {
            this.fetchPredictiveSearch(searchTerm);
          }
        }
        
        onKeyup(event) {
          if (event.code.toUpperCase() === 'ESCAPE') {
            this.close();
          }
        }
        
        onBodyClick(event) {
          if (!this.contains(event.target)) {
            this.close();
          }
        }
        
        fetchPredictiveSearch(searchTerm) {
          fetch(`/search/suggest?q=${encodeURIComponent(searchTerm)}&resources[type]=product&resources[limit]=4&section_id=predictive-search`)
            .then(response => response.text())
            .then(text => {
              const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-predictive-search').innerHTML;
              this.predictiveSearchResults.innerHTML = resultsMarkup;
              this.open();
            })
            .catch(error => {
              console.error(error);
            });
        }
        
        open() {
          this.predictiveSearchResults.style.display = 'block';
          this.isOpen = true;
        }
        
        close() {
          this.predictiveSearchResults.style.display = 'none';
          this.isOpen = false;
        }
        
        debounce(fn, wait) {
          let timeout;
          return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(context, args), wait);
          };
        }
      }
      
      customElements.define('search-bar', SearchBar);
    }