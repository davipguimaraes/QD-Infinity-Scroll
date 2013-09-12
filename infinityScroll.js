/**
* Infinity Scroll
* @author Carlos Vinicius [Quatro Digital]
* @version 3.4
* @contributor https://github.com/freires (https://github.com/caljp13/VTEX-Infinity-Scroll/pull/2)
*/
if("function"!==typeof(String.prototype.trim)) String.prototype.trim=function(){ return this.replace(/^\s+|\s+$/g,""); };
(function(){
	"use strict";
	var $ = jQuery;
	
	if(typeof $.fn.QD_infinityScroll === "function") return;

	// Iniciando as variáveis públicas do infinity scroll
	window._QuatroDigital_InfinityScroll = window._QuatroDigital_InfinityScroll || {};

	$.fn.QD_infinityScroll = function(opts){
		var defaults,log,extTitle,options,$this,$empty,$window, $document, toTopE, elemLoading, $public;
		
		// Reduzindo o nome da variável publica
		$public = window._QuatroDigital_InfinityScroll;

		// Função de log
		extTitle="Infinity Scroll";
		var log=function(a,b){if("object"===typeof console){var c="object"===typeof a;"undefined"===typeof b||"alerta"!==b.toLowerCase()&&"aviso"!==b.toLowerCase()?"undefined"!==typeof b&&"info"===b.toLowerCase()?c?console.info("["+extTitle+"]\n",a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):console.info("["+extTitle+"]\n"+a):c?console.error("["+extTitle+"]\n",a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):console.error("["+extTitle+"]\n"+a):c?console.warn("["+extTitle+"]\n",a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]):console.warn("["+extTitle+"]\n"+a)}};
		
		defaults = {
			// Última prateleira/vitrine na página
			lastShelf:">div:last",
			// Elemento com mensagem de carregando ao iniciar a requisição da página seguinte
			elemLoading:'<div id="scrollLoading">Carregando ... </div>',
			// Opção p/ definir a URL manualmente, ficando automático apenas a paginação. A url deve terminar com "...&PageNumber="
			searchUrl:null,
			// Objeto jQuery com o botão de voltar ao topo
			returnToTop:$('<div id="returnToTop"><a href="#"><span class="text">voltar ao</span><span class="text2">TOPO</span><span class="arrowToTop"></span></a></div>'),
			// Callback quando uma requisição ajax da prateleira é completada
			callback:function(){},
			// Cálculo do tamanho do footer para que uam nova página seja chamada antes do usuário chegar ao "final" do site
			getShelfHeight : function(){
				return ($this.scrollTop() + $this.height());
			},
			// Opção para fazer a paginação manualmente, uma nova página só é chamada quando executado o comando dentro desta função
			// Ela recebe como parâmetro: 1 função que chama a próxima página (caso ela exista)
			paginate:null,
			// Esta função é quem controla onde o conteúdo será inserido. Ela recebe como parâmetro: O ùltimo bloco inserido e os dados da nova requisição AJAX
			insertContent : function(currentItems, ajaxData){
				currentItems.after(ajaxData);
			}
		};
		options=jQuery.extend({},defaults, opts);
		$this=jQuery(this);
		$empty=jQuery("");
			
		if($this.length<1)
			return $this;

		// Checando se existe mais de uma prateleira selecionada
		if($this.length>1)
		{
			log("Identifiquei que a seletor informado ("+$this.selector+") retornou "+$this.length+" elementos.\n Como correto, selecionado o primeiro com o id: #"+($this.filter("[id^=ResultItems]:first").attr("id")||"!Not Found"),"Aviso");
			$this=$this.filter("[id^=ResultItems]:first");
		}
		
		// tentando adivinhar se esta pegando o elemento correto da prateleira
		if(!$this.filter("[id^=ResultItems]").length)
			log("Certifique-se que esta selecionando o elemento correto.\n O plugin espera que o elemento seja o que contém o id: #"+jQuery("div[id^=ResultItems]").attr("id")||"!Not Found","Aviso");
		if($this.parent().filter("[id^=ResultItems]").length)
		{
			log("Identifiquei que o seletor pai do elemento que você informou é o #"+(jQuery("div[id^=ResultItems]").attr("id")||"!Not Found")+".\n Como forma de corrigir esse problema de seleção de elemento, assumirei prateleira correta.","Aviso");
			$this=$this.parent();
		}
		
		// Adicionando botão de voltar ao topo
		$("body").append(options.returnToTop);
		
		$window=jQuery(window);
		$document=jQuery(document);
		toTopE=$(options.returnToTop);
		elemLoading=jQuery(options.elemLoading);
		$public.moreResults = true;
		$public.currentPage = 2;
		
		var fns = {
			scrollToTop:function()
			{
				var windowH=$window.height();
				
				$window.bind("resize.QD_infinityScroll",function(){
					windowH=$window.height();
				});
				
				$window.bind("scroll.QD_infinityScroll",function(){
					if($document.scrollTop()>(windowH))
						toTopE.stop(true).fadeTo(300,1,function(){toTopE.show();});
					else
						toTopE.stop(true).fadeTo(300,0,function(){toTopE.hide();});
				});
				
				toTopE.find("a").bind("click.QD_infinityScroll",function(){
					jQuery("html,body").animate({scrollTop:0},"slow");
					return false;
				});
			},
			getSearchUrl:function(){
				var url, content, preg, pregCollection;
				jQuery("script:not([src])").each(function(){
					content = jQuery(this)[0].innerHTML;
					preg = /\/buscapagina\?.+&PageNumber=/i;
					pregCollection = /\/paginaprateleira\?.+PageNumber=/i;
					if(content.indexOf("buscapagina") > -1){
						url = preg.exec(content);
						return false;
					} else if (content.indexOf("paginaprateleira") > -1) {
						url = pregCollection.exec(content);
						return false;
					}
				});

				if(typeof url !== "undefined" && typeof url[0] !== "undefined")
					return url[0].replace("paginaprateleira",'buscapagina');
				else {
					log("Não foi possível localizar a url de busca da página.\n Tente adicionar o .js ao final da página. \n[Método: getSearchUrl]");
					return "";
				}
			},
			infinityScroll : function(){
				var elementPages,fn,i;
				
				$public.searchUrl = (null !== options.searchUrl) ? options.searchUrl : fns.getSearchUrl();
				$public.currentStatus = true;
				
				// Quantidade de páginas obtidas na busca
				// Obtendo o elemento no HTML que informa o numero que completa o nome da variável
				elementPages = $(".pager[id*=PagerTop]:first").attr("id")||"";
				if(elementPages !== ""){
					// Obtendo a quantidade de páginas
					$public.pages = window["pagecount_" + elementPages.split("_").pop()];
					if(typeof $public.pages === "undefined"){
						// Buscando a quantidade de página dentro de "window" caso não tenha encontrado a variável com o ID obtido no elemento de paginação
						for(i in window)
							if(/pagecount_[0-9]+/.test(i)){
								$public.pages = window[i];
								break;
							}
					}
				}
				// Caso não seja possível obter uma página, é definido um valor gigantesco para que a parada seja feita automáticamente
				if(typeof $public.pages === "undefined")
					$public.pages = 9999999999999;
					
				fn = function(){
					if(!$public.currentStatus) return;
					
					var currentItems = $this.find(options.lastShelf);
					if(currentItems.length < 1){ log("Última Prateleira/Vitrine não encontrada \n (" + currentItems.selector + ")"); return false; }
					
					currentItems.after(elemLoading);
					$public.currentStatus = false;
					var requestedPage = $public.currentPage;
					$.ajax({
						url : $public.searchUrl.replace(/pagenumber\=[0-9]*/i, "PageNumber=" + $public.currentPage),
						dataType : "html",
						success : function(data){
							if(data.trim().length < 1){
								$public.moreResults = false;
								log("Não existem mais resultados a partir da página: " + requestedPage, "Aviso");
							}
							else
								options.insertContent(currentItems ,data);
							$public.currentStatus = true;
							elemLoading.remove();
						},
						error : function(){
							log("Houve um erro na requisição Ajax de uma nova página.");
						},
						complete : function(jqXHR, textStatus){
							options.callback();
						}
					});
					$public.currentPage++;
				};
				
				
				if(typeof options.paginate === "function")
					options.paginate(
						function(){
							if($public.currentPage <= $public.pages && $public.moreResults)
								fn();
						}
					);
				else
					$window.bind("scroll.QD_infinityScroll_paginate",function(){
						if($public.currentPage <= $public.pages && $public.moreResults && ($window.scrollTop() + $window.height()) >= options.getShelfHeight())
							fn();
						else
							return false;
					});
			}
		};

		fns.scrollToTop();	
		fns.infinityScroll();

		return $this;
	};
})(jQuery);