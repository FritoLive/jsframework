﻿(function ($) {
    var $default = {
        dialogId: null,
        content: null,
        position: "center",
        type: "text", // text | url | control --> dentro del dialog muestra el control indicado en content.
        modal: true,
        title: "",
        onCloseFunction: null,
        showCloseButton: true,
        width: null,
        height: null,
        top: 0,
        left: 0,
        allowDrag: true,
        allowResize: true,
        useJQueryUI: true,
        cloneControl: false,
        autoScroll: true,
        buttons: {}
    }
    $.fn.center = function (doAutoScroll) {
        var top = ($(window).height() - this.outerHeight()) / 2;
        var left = ($(window).width() - this.outerWidth()) / 2;
        var scrollLeft = 0;
        var scrollTop = 0;
        if (doAutoScroll === true) {
            scrollLeft = (window.pageXOffset || document.documentElement.scrollLeft) - (document.documentElement.clientLeft || 0);
            scrollTop = (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0);
        }

        left += scrollLeft;
        top += scrollTop;


        //return { top: (top > 0 ? top : 0), left: (left > 0 ? left : 0) };
        this.css({
            "top": top,
            "left": left
        });

        return {
            position: {
                "top": top,
                "left": left
            },
            scrollPosition: {
                "top": scrollTop,
                "left": scrollLeft
            }
        };
    }
    var webDialogsIds = 0;
    //función iframe y text
    $.webDialog = {
        
        close: function (id) {

            if (typeof id !== "undefined" && id !== null) {
                var dialogWindow = $("[webDialogId='" + id + "']");
                var diagCont = $(".webDialogContent", dialogWindow);
                var settings = $.extend({}, $default, dialogWindow.data("webDialog_config"));

                if ((diagCont.attr("webDialog_type") == "control") && (diagCont.attr("webDialog_cloned") == "false")) {
                    $("[webDialog_ctrlId]", diagCont)
                        .removeAttr("webDialog_ctrlId")
                        .removeAttr("parentWebDialogId")
                        .appendTo($("body"))
                        .hide();
                }
                diagCont = null;
                $("[webDialogId='divDialogCourtain_" + id + "']").remove();
                $("[webDialogId='iframe_" + id + "']", dialogWindow).remove();
                dialogWindow.remove();
                var result = true;
                if (arguments.length > 1 && typeof arguments[1] === "function") {
                    result = arguments[1]();
                    if (result !== false)
                        result = true;
                }
                if (typeof settings.onCloseFunction != "undefined" && settings.onCloseFunction != null && result)
                    settings.onCloseFunction();
            }
        },
        show: function (options) {
            var settings = $.extend({}, $default);

            //Si el parámetro es un objeto se asume que es la configuración
            //por lo que se carga la misma pisando los atributos por defecto.
            if (typeof options === "object")
                settings = $.extend(settings, options);

            //Si el parámetro es un string se asume un texto o url.
            if (typeof options === "string") {
                var opt = { content: options };
                //si el segundo parámetro es un string, se considera que es el tipo de cuadro de dialog que se desea mostrar
                //es decir: text, url (iframe) o control)
                if (arguments.length > 1) {
                    if (typeof arguments[1] === "string") {

                        //se sobreescribe, en la configuración, el tipo de dialog si es un URL o Control
                        //caso contrario se asume text.
                        if (arguments[1] === "url" || arguments[1] === "control") {
                            opt.type = arguments[1];
                            settings.type = arguments[1];
                        }
                    }
                        //Si el segundo parámetro es un object, se considera que son las opciones.
                    else if (typeof arguments[1] === "object") {
                        opt = $.extend(opt, arguments[1]);
                    }
                }
                options = opt;
                settings = $.extend(settings, options);
            }


            var currentId = null;
            if (typeof settings.dialogId !== "undefined" && settings.dialogId !== null)
                currentId = settings.dialogId;
            else {
                currentId = webDialogsIds;
                webDialogsIds++;
            }

            //Se crea el div del dialog mismo.
            var dialogContainer = $("<div id='divDialogWindow_" + currentId + "' webDialogId='" + currentId + "' title='" + settings.title + "' class='modalDialog'></div>");
            //Se crea un div que va a contener el text, control o iframe del dialog.
            var dialogContent = $("<div class='webDialogContent' style='height:85%'></div>");


            if (settings.content != null) {

                if (settings.type === "url") {
                    dialogContent.attr("webDialog_type", "url");
                    var iFrameCtrl = $("<iframe frameborder='0' src='" + settings.content + "' webDialogId='iframe_" + currentId + "' class='webDialogModalIFrame' style='width:100%;height:100%'/>");
                    dialogContent.append(iFrameCtrl);
                }
                else if (settings.type === "control") {
                    dialogContent.attr("webDialog_type", "control");
                    var ctrl = $(settings.content);
                    if (ctrl.length > 1)
                        ctrl = $(ctrl[0]);

                    if (settings.cloneControl)
                        dialogContent.append(ctrl.clone());
                    else {
                        dialogContent.attr("webDialog_cloned", "false");
                        if (typeof ctrl.attr("webDialog_ctrlId") === "undefined" || !ctrl.attr("webDialog_ctrlId")) {
                            ctrl.each(function (index, item) {
                                $(item).attr("webDialog_ctrlId", index.toString());
                                $(item).attr("parentWebDialogId", currentId);
                            });
                        }
                        else {
                            return;
                        }

                        dialogContent.append(ctrl);
                        ctrl.show();
                    }
                }
                else {
                    dialogContent.attr("webDialog_type", "text");
                    dialogContent.html(settings.content);
                }

                //Se crea la barra de Título
                var titleBar = $("<div class='dialogTitleContainer' style='height:5%'><span webDialogId='dialogTitle' class='dialogTitle'>" + settings.title + "</span><a href='#' class='dialogTitleButtonBarContainer' webDialogId='buttonBarContainer'></a></div>");
                if (settings.showCloseButton)
                    $("[webDialogId='buttonBarContainer']", titleBar).append($("<span webDialogId='closeButton' class='dialogCloseButton' onClick='$.webDialog.close(\"" + currentId + "\");' >cerrar</span>"));

                //Se crea el div con el pie del dialog.
                var footerBar = $("<div style='width:100%;height:10%;padding:0px;margin:0px' class='dialogFooterContainer' ></div>");
                if (typeof settings.buttons === "object") {
                    $.each(settings.buttons, function (text, func) {
                        var button = $("<input type='button' webDialog_button='true' value='" + text + "' />");
                        button.click(function (evt) {
                            func(this, evt, dialogContainer);
                        });
                        footerBar.append(button);
                    })

                }

                dialogContainer.data("webDialog_config", options);
                dialogContainer.append(titleBar);
                dialogContainer.append(dialogContent);
                dialogContainer.append(footerBar);


                if (settings.useJQueryUI) {
                    dialogContainer.addClass("ui-dialog ui-widget ui-widget-content ui-corner-all");
                    if (settings.type !== "url")
                        dialogContent.addClass("ui-dialog-content");

                    dialogContent.addClass("ui-widget-content");
                    titleBar.addClass("ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix");
                    $("[webDialogId='dialogTitle']", titleBar).addClass("ui-dialog-title");
                    $("[webDialogId='buttonBarContainer']", titleBar).addClass("ui-dialog-titlebar-close ui-corner-all");
                    $("[webDialogId='closeButton']", titleBar).addClass("ui-icon ui-icon-closethick");
                    $("[webDialog_button]", footerBar).addClass("ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");

                    //footerBar.addClass();
                }

                dialogContainer.appendTo($("body")).css(
                    {
                        position: "absolute",
                        top: settings.top,
                        left: settings.left,
                        zIndex: 9999
                    })
                    .focus()
                    .keyup(function (evt) {
                        if (evt.keyCode == "27")
                            $.webDialog.close($(this).attr("webDialogId"));
                    });

                if (settings.width)
                    dialogContainer.width(settings.width);
                if (settings.height)
                    dialogContainer.height(settings.height);
                if (settings.position != null && settings.position == "center") {
                    dialogContainer.center(settings.autoScroll);
                    $(window).resize(function () {
                        dialogContainer.center(settings.autoScroll);
                        var webDialogId = dialogContainer.attr("webDialogId");
                        var courtain = $("[webDialogId=divDialogCourtain_" + webDialogId + "][webDialog_controlType=courtain]")

                        var scrollLeft = (window.pageXOffset || document.documentElement.scrollLeft) - (document.documentElement.clientLeft || 0);
                        var scrollTop = (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0);
                        courtain.css({
                            width: $(window).width() + scrollLeft,
                            height: $(window).height() + scrollTop
                        });

                    }).scroll(function () {
                        dialogContainer.center(settings.autoScroll);
                        var webDialogId = dialogContainer.attr("webDialogId");
                        var courtain = $("[webDialogId=divDialogCourtain_" + webDialogId + "][webDialog_controlType=courtain]")

                        var scrollLeft = (window.pageXOffset || document.documentElement.scrollLeft) - (document.documentElement.clientLeft || 0);
                        var scrollTop = (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0);
                        courtain.css({
                            width: $(window).width() + scrollLeft,
                            height: $(window).height() + scrollTop
                        });
                    });
                }

                if (settings.allowDrag) {
                    //ui-draggable
                    dialogContainer.draggable({ iframeFix: (settings.type === "url"), handle: ".dialogTitleContainer" });
                }
                //ui - resizable
                if (settings.allowResize) {
                    dialogContainer.resizable({ resize: settings.onResize });
                }


                if (settings.modal != null && settings.modal === true) {
                    var courtain = $("<div webDialogId='divDialogCourtain_" + currentId + "' webDialog_controlType='courtain' class='divDialogCourtain' ></div>");

                    var scrollLeft = (window.pageXOffset || document.documentElement.scrollLeft) - (document.documentElement.clientLeft || 0);
                    var scrollTop = (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0);

                    if (settings.useJQueryUI) {
                        courtain.addClass("ui-widget-overlay").css({
                            width: $(window).width() + scrollLeft,
                            height: $(window).height() + scrollTop
                        });
                    }
                    else {
                        courtain.css({
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: $(window).width() + scrollLeft,
                            height: $(window).height() + scrollTop,
                            zIndex: 9998
                        });
                    }
                    courtain.appendTo($("body"));
                }
            }

            return dialogContainer;
        }
    }

    $.fn.webDialog = function (options) {
        var settings = $.extend({}, $default);
        if (typeof options === "object") {
            settings = $.extend(settings, options);
        }
        else if (typeof options === "string") {
            if (options === "close") {
                var webDialogId = null;
                var onClosefn = arguments.length > 1 ? arguments[1] : null;
                if (typeof (webDialogId = $(this).attr("parentWebDialogId")) !== "undefined" && webDialogId != "") {
                    $.webDialog.close(webDialogId, onClosefn);
                }
                else if (typeof (webDialogId = $(this).attr("webDialogId")) !== "undefined" && webDialogId != "") {
                    $.webDialog.close(webDialogId, onClosefn);
                }
                return this;
            }
        }
        //si se llama al plugin, se inicializa el control original
        settings.content = this;
        settings.type = "control";
        $.webDialog.show(settings);
        return this;
    }
})(jQuery);
/*
================================================================
                           VERSIÓN
================================================================
Código:       | webDialog - 2014-11-06 1455 - 1.1.3.0
----------------------------------------------------------------
Nombre:       | webDialog
----------------------------------------------------------------
Tipo:         | FUNCIÓN y PLUGIN
----------------------------------------------------------------
Descripción:  | plugin de jquery que permite mostrar en un 
| cuadro de diálogo en el cual se podrá:
|  - abrir una página web (iframe)
|  - mostrar un texto
|  - mostrar un control
----------------------------------------------------------------
Autor:        | Sebastián Bustos
----------------------------------------------------------------
Versión:      | v1.1.3.0
----------------------------------------------------------------
Fecha:        | 2014-09-18 10:28
----------------------------------------------------------------
Cambios de la Versión:
- Se agregó la posibilidad de configurar el ID que se utilizará
para el webDialog
================================================================
FUNCIONALIDADES
================================================================
- mostrar en un dialog una página (iframe)           (función)
- mostrar en un dialog un texto                      (función)
- mostrar en un dialog el contenido de un control    (plugin)
- mostrar el cuadro de dialogo en forma modal o no.
- dag & drop del cuadro de diálogo
- redimensionar
- encabezado con título (opcional) y poder mostrar un botón cerrar
- cerrar el cuadro con "ESC"
- estética de jquery
- estética personalizada
- Agregado de botones particulares.
================================================================
POSIBLES MEJORAS
================================================================
-
================================================================
HISTORIAL DE VERSIONES
================================================================
Código:       | webDialog - 2014-09-18 1028 - 1.1.2.0
Autor:        | Sebastián Bustos
----------------------------------------------------------------
Cambios de la Versión:
- Se modificó para que reubique correctamente el dialog y el
courtain al scrollar o cambiar el tamaño de la ventana contenedora
del mismo.
================================================================
Código:       | webDialog - 2014-09-12 1157 - 1.1.1.0
Autor:        | Sebastián Bustos
----------------------------------------------------------------
Versión:      | v1.1.1.0
----------------------------------------------------------------
Fecha:        | 2014-09-12 11:57
----------------------------------------------------------------
Cambios de la Versión:
- Se agregó la posiblidad de configurar el autoScroll, que 
posicionará el cuadro de diálogo en la ubicación donde se encuentre
scrollada la pantalla.
- Se agregó la clase dialogTitleButtonBarContainer al anchor que 
contiene la barra de controles
- Se modificó el plugin para que, cuando se muestra una URL en un
iframe, no muestre el scroll del dialog, sino sólo el del frame.
- Se corrigió un problema que existía cuando se iniciaba el dialogo
en una ventana pequeña, y este sobre pasaba la misma, y al agrandar
la ventana, partes del dialogo permanecían fuera de los márgenes
a pesar de caber. Se modificó para que en el resize de la ventana, 
se reposicione el dialogo en el centro.
================================================================
Código:       | webDialog - 2014-07-21 - 1.1.0.0
----------------------------------------------------------------
Autor:        | Sebastián Bustos
----------------------------------------------------------------
Versión:      | v1.1.0.0
----------------------------------------------------------------
Fecha:        | 2014-07-21 10:34
----------------------------------------------------------------
Cambios de la Versión:
- Se corrigió una falla que existía cuando se llamaba al plugin
pasando como primer parámetro el texto a mostrar en el mensaje
y como segundo la configuración. La misma no estaba almacenándose
en el componente para luego recuperarla.
- Se cambió el nombre del atributo usado para almacenar la 
configuració, de "webDialog:config" a "webDialog_config"
================================================================
Código:       | webDialog - 2012-09-20 1730 - 1.0.0.5
----------------------------------------------------------------
Autor:        | Sebastián Bustos
----------------------------------------------------------------
Versión:      | v1.0.0.5
----------------------------------------------------------------
Fecha:        | 2013-06-17 16:36
----------------------------------------------------------------
Cambios de la Versión:
- Se agregó la devolución del control de dialog al ejecutarse
el método, para que sea posible, por ejemplo, almacenar en una
variable el control, y cerrarlo a demanda.
- Se agregó, al div de cortina, la clase divDialogCourtain
----------------------------------------------------------------
Código:       | webDialog - 2012-09-20 1730 - 1.0.0.4
----------------------------------------------------------------
Autor:        | Sebastián Bustos
----------------------------------------------------------------
Versión:      | v1.0.0.4
----------------------------------------------------------------
Fecha:        | 2012-09-29 17:30
----------------------------------------------------------------
Cambios de la Versión:
- Se agregó la posibilidad, al llamar manualmente al método Close, 
definir una función a ejecutarse luego del cierre del dialog. 
Esta función se ejecutará antes del onCloseFunction configurado
y podrá cancelar la ejecución de este si retorna false.
================================================================
Código:       | webDialog - 2012-09-20 1210 - 1.0.0.3
----------------------------------------------------------------
Autor:        | Sebastián Bustos
----------------------------------------------------------------
Versión:      | v1.0.0.3
----------------------------------------------------------------
Fecha:        | 2012-09-20 12:10
----------------------------------------------------------------
Cambios de la Versión:
- Cuando se utiliza el tipo "control" (por ej. se utiliza el 
plugin de jquery) al cerrar el diálogo se quitan los atributos
en el control subyancente. Esto soluciona un problema que se daba
al abrir y cerrar varias veces el mismo diálogo, por el cual
quedaba visible el cuadro de diálogo.
================================================================
Código:       webDialog - 2012-05-22 1031 - 1.0.0.2
Autor:        Sebastián Bustos
Cambios de la Versión:
- Se agregó la posibilidad de, cuando el primer parámetro es un 
string, que el segundo sean las opciones.
- Se agregó la posibilidad de no mostrar el botón de cierre de 
la ventana.
================================================================
Código:       webDialog - 2012-04-13 1314 - 1.0.0.1
Autor:        Sebastián Bustos
Cambios de la Versión:
- Se agregó tamaño porcentual al title, body y footer del dialog
para asegurar que no se soslapen los divs
- Se quitó el "alsoResize" del resizable porque soslapaba el 
iframe con los otros divs.
- se habilitó el "iframeFix" del draggable para evitar que se tilde
con el iframe.
================================================================
Código:       webDialog - 2012-02-06 1347 - 1.0.0.0
Autor:        Sebastián Bustos
Cambios de la Versión:
- Primera Versión
================================================================*/