﻿/*
Especificaciones:
- Hacer un DataTypeValidator("remove") para quitar la lógica de validación.
- Permitir desactivar el script de inicialización automático.

- una función que se pueda hacer validate(myString, tipoDato) 
    Ej: 
      $.validate("12345", numeric|currency|string|"abc...XYZ");

- un plugin de jquery que:
    - No permita ingresar caracteres no válidos según el tipo
    - valide la longitud del texto
    - valide lo ingresado según el tipo de dato configurado al perder el foco

- un script que automáticamente lea un atributo e inicialice el plugin para los controles.

*/
(function ($) {
    "use strict"
    var guid = 0;
    var $default = {
        dataType: '*', /* *        => cualquier caracter
					alphabetic  => sólo letras [a-z A-Z] áÁ éÉ íÍ óÓ úÚ üÜ
					special   => letras y caracteres especiales [a-z A-Z] áÁ éÉ íÍ óÓ úÚ üÜ !"·$%&/()=?¿¡'+`{}[]-_<>ªº
					number    => sólo números [0-9] - , .
                    integer   => sólo números [0-9]
					currency    => números decimales [0-9] - , . $
					date     => los caracteres necesarios para una fecha [0-9] /
					datetime => los caracteres necesarios para una fecha y hora [0-9] / :
					time     => los caracteres necesarios para una hora [0-9] :
					regex    => que cumpla con la expresión regular definida
				*/

        dateformat: null,
        includeTime: true,
        useJQueryDatepicker: true,
        datePickerSettings: {},
        allowCurrency: false,
        allowDecimals: true,
        allowNegativesValues: true,
        allowedChars: null,
        specialChars: null,
        validDataRegex: null,
        allowNumbers: true,

        commaSeparators: null, //el/los caracteres que se utilizarán como separador de decimales. Si se incluyen varios se permitirá cualquiera de ellos.
        invalidDataCss: 'invalidData',
        invalidMessageCss: 'default',
        showInvalidMessage: true,
        onValidationFailed: function (src) { }, //Se ejecuta cuando se pierde el foco y el dato del control es inválido
        onInvalidKeyPress: function (src, evt) { }, //Se ejecuta cada vez que se presiona una tecla inválida.
        invalidDataMessage: "El dato ingresado es inválido"
    }
    var internalMethods = {
        getAllowedChars: function (settings) {
            var allowedChars = settings.allowedChars;
            if (typeof allowedChars !== "undefined" && allowedChars !== null) {
                if (typeof settings.specialChars !== "undefined" && settings.specialChars !== null)
                    allowedChars += settings.specialChars;
                if (settings.allowCurrency)
                    allowedChars += "$";
                if (settings.allowDecimals) {
                    var isCommaDecSep = (parseFloat("1.0") > parseFloat("1,0"));
                    var commaSep;
                    if (isCommaDecSep)
                        commaSep = ","
                    else
                        commaSep = "."
                    allowedChars += commaSep;
                }
                if (settings.allowNegativesValues)
                    allowedChars += "-";
            }
            else allowedChars = null;

            return allowedChars;
        }
    }
    //#region Funciones de validación para cada tipo de dato
    var genericDataTypeValidator = {
        ValidateInput: function (keyCode, currValue, settings) {
            var allowedChars = internalMethods.getAllowedChars(settings)
            var inputChar = String.fromCharCode(keyCode);
            var isValid = true;
            //sólo se valida si existe algún caracter configurado, sino se asume que acepta todos.
            if (typeof allowedChars !== "undefined" && allowedChars !== null) {
                isValid = allowedChars.indexOf(inputChar) >= 0;
                if (!isValid && typeof specialChars === "string" && specialChars !== null)
                    isValid = isValid & specialChars.indexOf(inputChar);
            }
            return isValid;
        }
        , ValidateData: function (string, settings) {
            var retVal = false;
            var allowedChars = internalMethods.getAllowedChars(settings)
            var validDataRegex = settings.validDataRegex;

            var regConfig = "";
            var isValidDataRegexDefined = (typeof validDataRegex !== "undefined" && validDataRegex !== null && validDataRegex.length > 0);
            var isAllowedCharsDefined = (typeof allowedChars !== "undefined" && allowedChars !== null && allowedChars > 0);

            //Si no está definida la lista de caracteres permitidos, ni una expresión regular, se permiten todos los caracteres.
            if (!isValidDataRegexDefined && !isAllowedCharsDefined)
                retVal = true;
            else {
                if (!isValidDataRegexDefined) {
                    //se reemplazan los caracteres reservados de las expresiones regulares por sus respectivos caracteres de escape.
                    allowedChars = allowedChars
                                        .replace(".", "\.")
                                        .replace("[", "\[")
                                        .replace("]", "\]")
                                        .replace("(", "\(")
                                        .replace(")", "\)")
                                        .replace("*", "\*")
                                        .replace("+", "\+")
                                        .replace("$", "\$")
                                        .replace("\\", "\\\\")
                                        .replace("^", "\^");

                    validDataRegex = "^[" + allowedChars + "]*$";
                    regConfig = "gi";
                }
                else {
                    var end;
                    //se valida si la expresión regular tiene el formato /expres/config
                    //en cuyo caso se separa expres y config.

                    if (validDataRegex[0] === "/")
                        //Se quita el primer / si existe
                        validDataRegex = validDataRegex.slice(1);
                    if ((end = validDataRegex.lastIndexOf("/")) > 0) {
                        //Se quita la parte de configuración y se guarda
                        regConfig = validDataRegex.slice(end);
                        //se quita el / final de la expresión regular.
                        regConfig = regConfig.slice(1);
                        //la expresión en sí misma.
                        validDataRegex = validDataRegex(0, end);
                    }
                }

                var regex = new RegExp(validDataRegex, regConfig);
                retVal = regex.test(string);
            }
            return retVal;
        }
    }

    var alphabeticDataTypeValidator = {
        ValidateInput: function (keyCode, currValue, settings) {
            var specialChars = settings.specialChars;
            var allowedChars = "abcdefghijklmnñopqrstuvwxyzABCDEFGHIJKLMNÑOPQRSTUVWXYZ áéíóúÁÉÍÓÚüÜ";
            if (settings.allowNumbers)
                allowedChars += "0123456789";
            var inputChar = String.fromCharCode(keyCode);

            var isValid = allowedChars.indexOf(inputChar) >= 0;
            if (!isValid && typeof specialChars === "string" && specialChars !== null)
                isValid = isValid & specialChars.indexOf(inputChar);

            return isValid;
        }
        , ValidateData: function (string, settings) {
            var specialChars = settings.specialChars;
            var validDataRegex = settings.validDataRegex;
            var regConfig = "";
            if (typeof validDataRegex === "undefined" || validDataRegex === null || validDataRegex.length === 0) {
                var numberRegex = "";
                if (settings.allowNumbers)
                    numberRegex = "0123456789";

                validDataRegex = "^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ\\s" + numberRegex + "]*$";
                regConfig = "gi";
            }
            else {
                var end;
                //se valida si la expresión regular tiene el formato /expres/config
                //en cuyo caso se separa expres y config.

                if (validDataRegex[0] === "/")
                    //Se quita el primer / si existe
                    validDataRegex = validDataRegex.slice(1);
                if ((end = validDataRegex.lastIndexOf("/")) > 0) {
                    //Se quita la parte de configuración y se guarda
                    regConfig = validDataRegex.slice(end);
                    //se quita el / final de la expresión regular.
                    regConfig = regConfig.slice(1);
                    //la expresión en sí misma.
                    validDataRegex = validDataRegex(0, end);
                }
            }

            var regex = new RegExp(validDataRegex, regConfig);
            return regex.test(string);
        }
    }
    var numericDataTypeValidator = {
        ValidateInput: function (keyCode, currValue, settings) {
            var commaSep = settings.commaSeparators;
            var allowCurrency = settings.allowCurrency;
            var commaSepCharCode = [];
            var commaSepChar = [];
            if (typeof commaSep === "string") {
                commaSep = commaSep.split('');
            }

            if (typeof allowCurrency === "undefined" || allowCurrency !== true)
                allowCurrency = false;

            //para cada caracter del commaSep se obtiene el char Code
            if (typeof commaSep !== "undefined" && commaSep !== null && commaSep !== "") {
                for (var commaChar in commaSep) {
                    //se obtiene el charcode del caracter
                    commaSepCharCode.push(commaSep[commaChar].charCodeAt(0));
                    //se registra el caracter
                    commaSepChar.push(commaSep[commaChar]);
                }
            }
                //si no se configuró ningún separador particular, se usa el default
            else {
                var isCommaDecSep = (parseFloat("1.0") > parseFloat("1,0"));
                if (isCommaDecSep) {
                    //44 ==> , (coma)  , teclado y numpad
                    commaSepCharCode = [44];
                    commaSepChar = [","];
                }
                else {
                    //46 ==> . (punto) , teclado y numpad
                    commaSepCharCode = [46];
                    commaSepChar = ["."];
                }
            }

            var isValid = (keyCode >= 48 && keyCode <= 57); //48 al 57 == Nº 0 al 1, teclado superior y numpad
            //Si no es un número se validan los caracteres especiales: separador de decimales y menos.
            if (!isValid) {
                if (typeof currValue === "undefined" || currValue === null)
                    currValue = "";

                //Sólo se admite el menos si es el primer caracter.
                isValid = isValid || ((keyCode === 45) && settings.allowNegativesValues && (currValue.length == 0)); //==> - (menos) , teclado y numpad 

                //si se habilita el símbolo de pesos y el caracter, hasta acá, no era válido, se verifica si es el símbolo.
                if (allowCurrency && !isValid) {
                    //se valida que el símbolo $ sea el primer caracter o el primero luego del -.
                    if (currValue.length == 0 || currValue.length == 1 && currValue === "-") {
                        //sólo se admite un caracter $
                        if (currValue.indexOf("$") < 0)
                            isValid = isValid || (keyCode == 36);
                    }
                }

                //Si el caracter NO es el menos, se verifica si es un separador de decimal. Pero sólo si ya hay algún número ingresado, 
                //ya que de lo contrario no se admite el separador.
                if (settings.allowDecimals && !isValid && (currValue.length > 1 || currValue.length == 1 && currValue !== "-")) {
                    var bAllow = true;
                    //Sólo se admite UN SÓLO caracter de decimales
                    for (var commaChar in commaSepChar) {
                        if (currValue.indexOf(commaSepChar[commaChar]) >= 0) {
                            bAllow = false;
                            break;
                        }
                    }
                    if (bAllow) {
                        for (var commaChar in commaSepCharCode) {
                            if (isValid = (isValid || (keyCode === commaSepCharCode[commaChar])))
                                break;
                        }
                    }
                }
            }

            return isValid;
        }
        , ValidateData: function (string, settings) {
            var commaSep = settings.commaSeparators;
            var allowCurrency = settings.allowCurrency;
            var validDataRegex = settings.validDataRegex;

            var regConfig = "";
            if (typeof validDataRegex === "undefined" || validDataRegex === null || validDataRegex.length === 0) {
                if (typeof commaSep === "undefined" || commaSep === null) {
                    var isCommaDecSep = (parseFloat("1.0") > parseFloat("1,0"));
                    if (isCommaDecSep)
                        commaSep = ","
                    else
                        commaSep = "."
                }
                var currencyRegex = allowCurrency ? "[\\$]{0,1}" : "";
                var decimalRegex = settings.allowDecimals ? "([" + commaSep + "]{0,1}(\\d)+||(\\d)*)" : "";
                var negativesRegex = settings.allowNegativesValues ? "[-]{0,1}" : "";
                validDataRegex = "^" + negativesRegex + currencyRegex + "(\\d)+" + decimalRegex + "$";
                regConfig = "gi";
            }
            else {
                var end;
                //se valida si la expresión regular tiene el formato /expres/config
                //en cuyo caso se separa expres y config.

                if (validDataRegex[0] === "/")
                    //Se quita el primer / si existe
                    validDataRegex = validDataRegex.slice(1);

                if ((end = validDataRegex.lastIndexOf("/")) > 0) {
                    //Se quita la parte de configuración y se guarda
                    regConfig = validDataRegex.slice(end);
                    //se quita el / final de la expresión regular.
                    regConfig = regConfig.slice(1);
                    //la expresión en sí misma.
                    validDataRegex = validDataRegex.slice(0, end);
                }
            }

            var regex = new RegExp(validDataRegex, regConfig);
            return regex.test(string);
        }
    }
    var dateDataTypeValidator = {
        ValidateInput: function (keyCode, currValue, settings) {
            var isValid = (keyCode >= 48 && keyCode <= 57); //48 al 57 == Nº 0 al 1, teclado superior y numpad
            //si no es un caracter numérico, se valida si es alguno de los caracteres especiales especificados.
            if (!isValid) {
                var specialChars = ["/"];
                if (settings.includeTime) {
                    specialChars.push(" ");
                    specialChars.push(":");
                }
                if (typeof specialChars !== "undefined" && specialChars !== null) {
                    for (var char in specialChars) {
                        if (isValid = (isValid || (keyCode == specialChars[char].charCodeAt(0))))
                            break;
                    }
                }
            }

            return isValid;
        }
        , ValidateData: function (string, settings) {
            var dateFormat = settings.dateformat;
            var validDataRegex;
            var regConfig = "";
            if (typeof dateFormat === "undefined" || dateFormat === null || dateFormat.length === 0) {
                validDataRegex = "^([0-9]{1,2})/([0-9]{1,2})/([0-9]{4})";
                if (settings.includeTime)
                    validDataRegex += "(?:\\s([0-9]{1,2}):([0-9]{1,2})){0,1}";
                validDataRegex += "$";
                regConfig = "gi";
            }
            else {
                var end;
                //se valida si la expresión regular tiene el formato /expres/config
                //en cuyo caso se separa expres y config.
                var AMPMformat = (validDataRegex.indexOf("hh") >= 0);

                validDataRegex = dateFormat;
                validDataRegex = validDataRegex.replace(/dd/g, "([0-9]{1,2})");
                validDataRegex = validDataRegex.replace(/mm/g, "([0-9]{1,2})");
                validDataRegex = validDataRegex.replace(/yyyy/g, "([0-9]{4})");
                validDataRegex = validDataRegex.replace(/HH/g, "([0-9]{1,2})");
                validDataRegex = validDataRegex.replace(/hh/g, "([0-9]{1,2})");
                if (AMPMformat)
                    validDataRegex = validDataRegex.replace(/mm/g, "([0-9]{1,2})");
                else
                    validDataRegex = validDataRegex.replace(/mm/g, "([0-9]{1,2})\\s(am|pm)");
            }

            var regex = new RegExp(validDataRegex, regConfig);
            return regex.test(string);
        }
    }
    //#endregion

    var methods = {
        initValidator: function ($this, $default, options, dataTypeObject) {
            var settings = $.extend({}, $default, options);
            var dataType = options.dataType;

            if (typeof $this.attr("ValidatorId") === "undefined" || $this.attr("ValidatorId") === "") {
                var elemId = $this[0].id;
                if (typeof elemId === "undefined" || elemId === "") {
                    elemId = guid;
                    guid++
                }

                $this.attr("ValidatorId", elemId);
            }

            $this.data("DataTypeValidatorConfig", options);

            $this.keypress(function (evt) {
                var $this = $(this);
                //si se presiona una tecla sobre el control, y está configurado el mensaje de validación, se oculta el mensaje.
                if (settings.showInvalidMessage) {
                    $this.removeClass(settings.invalidDataCss);
                    $("#InvalidMessage" + $this.attr("ValidatorId")).remove();
                }

                var isValid = dataTypeObject.ValidateInput(evt.which, $this.val(), settings);

                if (!isValid && typeof settings.onInvalidKeyPress === "function")
                    settings.onInvalidKeyPress($this, evt);

                return isValid;
            })
                .keyup(function (evt) {
                    if (settings.showInvalidMessage) {
                        //si se presiona la tecla backspace o del sobre el control, y está configurado el mensaje de validación, se oculta el mensaje.
                        if (evt.which === 8 || evt.which === 46) {
                            var $this = $(this);
                            $this.removeClass(settings.invalidDataCss);
                            $("#InvalidMessage" + $this.attr("ValidatorId")).remove();
                        }
                    }
                })
                .focusout(function () {
                    var $this = $(this);
                    if ($this.val() !== "" && !dataTypeObject.ValidateData($this.val(), settings)) {
                        $this.addClass(settings.invalidDataCss);
                        if (settings.showInvalidMessage) {
                            var elemId = $this.attr("ValidatorId");
                            $("#InvalidMessage" + elemId).remove();
                            //si el usuario sobreescribe el css message se usa ese, aunque este sea vacío, pero si no sobreescribe coloca
                            //por defecto "invalidMessage"
                            var cssMessage = settings.invalidMessageCss === 'default' ? "" : settings.invalidMessageCss;
                            //si existe definido un CSS para el mensaje, se coloca la clase específica según el tipo de dato, sino no.
                            var cssDataTypeMessage = (cssMessage !== '' && typeof cssMessage !== "undefined") ? " " + dataType + cssMessage : "";

                            var invalidMsg = $("<div id='InvalidMessage" + elemId + "' class='" + cssMessage + cssDataTypeMessage + "' >" + settings.invalidDataMessage + "</div>");
                            $this.parent().append(invalidMsg);
                            var pos = $this.position();
                            invalidMsg.css({
                                position: "absolute",
                                top: (pos.top - ($this.height() - ($this.height() / 10))),
                                left: pos.left
                            });

                            if (settings.invalidMessageCss === 'default') {
                                invalidMsg.css({
                                    borderWidth: 1,
                                    borderStyle: "solid",
                                    borderColor: "#CCCCCC",
                                    borderRadius: "5px 5px",
                                    backgroundColor: "#FF8C8C",
                                    color: "#FFFFFF"
                                });
                            }

                        }
                        if (typeof settings.onValidationFailed === "function")
                            settings.onValidationFailed($this);
                    }
                });

            if ((dataType === "date" || dataType === "datetime") && settings.useJQueryDatepicker) {
                var $defaultDatePickerSetting = {
                    closeText: "cerrar",
                    prevText: "<",
                    nextText: ">",
                    currentText: "actual",
                    monthNames: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
                    monthNamesShort: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
                    dayNames: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
                    dayNamesShort: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
                    dayNamesMin: ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"],
                    weekHeader: "Semana",
                    dateFormat: "dd/mm/yy"
                }

                var datePickSett = $.extend({}, $defaultDatePickerSetting, settings.datePickerSettings);
                $this.datepicker(datePickSett);
            }
        },
        setGenericValidator: function (options, $this) {
            methods.initValidator($this, $default, options, genericDataTypeValidator);
        },
        setCurrencyValidator: function (options, $this) {
            //El currency es un número que acepta el caracter de $. El allowCurrency define si se permite o no este caracter, y por defecto está 
            //deshabilitado por lo que se hace el extend para que, si el usuario no lo especificó, por defecto se habilite, para este tipo de dato.
            options = $.extend({ allowCurrency: true }, options);
            methods.initValidator($this, $default, options, numericDataTypeValidator);
        },

        setNumericValidator: function (options, $this) {
            methods.initValidator($this, $default, options, numericDataTypeValidator);
        },

        setAlphabeticValidator: function (options, $this) {
            methods.initValidator($this, $default, options, alphabeticDataTypeValidator);
        },

        setDateValidator: function (options, $this) {
            methods.initValidator($this, $default, options, dateDataTypeValidator);
        }
    };

    ///Plugin, este permite configurar los data type validators para un control o un conjunto de controles a partir del resultado de un selector 
    ///jquery
    $.fn.DataTypeValidator = function (options) {
        function init($this) {
            if (typeof options === "string")
                options = { dataType: options };

            var settings = $.extend({}, $default, options);

            $this.attr("DataType", settings.dataType);

            if (settings.dataType === "numeric")
                methods.setNumericValidator(options, $this);
            else if (settings.dataType === "integer")
                methods.setNumericValidator($.extend({}, { allowDecimals: false }, options), $this);
            else if (settings.dataType === "alphabetic")
                methods.setAlphabeticValidator(options, $this);
            else if (settings.dataType === "currency")
                methods.setCurrencyValidator(options, $this);
            else if (settings.dataType === "date")
                methods.setDateValidator(options, $this);
            else
                methods.setGenericValidator(options, $this);
            /*else
                alert("El tipo de dato configurado no existe, los tipos válidos son: \"numeric\", \"integer\", \"alphabetic\", \"currency\", \"date\"");
            */
        }

        init(this);
        return this;
    }
    ///Script que inicializa los validator de una página, para todos los controles que tengan definido el atributo "DataType". 
    ///Este script se ejecuta siempre que se agrega la referencia a este .js
    function Init() {
        $(document).ready(function () {
            //busca todos los controles que tengan el atributo "DataType"
            $("[DataType]").each(function (index) {
                var $this = $(this);
                var dataType = $this.attr("DataType").toLowerCase();
                var settings = {};
                if (typeof DateTypeValidatorGetSettings === "function")
                    settings = DateTypeValidatorGetSettings(dataType);
                var validRegex = $this.attr("validDataRegex");
                if (typeof validRegex !== "undefined" && validRegex !== null && validRegex !== "")
                    settings = $.extend(settings, { "validDataRegex": validRegex });

                var allowedChars = $this.attr("allowedChars");
                if (typeof allowedChars !== "undefined" && allowedChars !== null && allowedChars !== "") {
                    allowedChars = (allowedChars.replace("0-9", "0123456789")
                                               .replace(/a-z/g, "abcdefghijklmnñopqrstuvwxyz")
                                               .replace(/A-Z/g, "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ"));
                    settings = $.extend(settings, { "allowedChars": allowedChars });
                }
                var options = $.extend(settings, { "dataType": dataType });

                $this.DataTypeValidator(options);
            });
        });
    }

    Init();
})(jQuery);
/*
================================================================
                            VERSIÓN
================================================================
Código:       | DataTypeValidators - 2015-01-22 - v3.0.0.0
----------------------------------------------------------------
Nombre:       | DataTypeValidators
----------------------------------------------------------------
Tipo:         | PLUGIN 
----------------------------------------------------------------
Descripción:  | Permite configurar los controles para que 
              | acepten determinados tipos de datos.
			  | Asocia al control un comportamiento y restricciones
			  | en función del tipo de dato configurado.
			  | Permite configurar manualmente cada control, utilizando
			  | directamente el plugin de jquery y además
			  | al agregarse la referencia attacha al evento ready
			  | del document, un código que lee todos los controles
			  | con el atributo "datatype" y asocia automáticamente
			  | el validator correspondiente al control.
----------------------------------------------------------------
Autor:        | Sebastián Bustos Argañaraz
----------------------------------------------------------------
Versión:      | v3.0.0.0
----------------------------------------------------------------
Fecha:        | 2015-01-22
----------------------------------------------------------------
Cambios de la Versión:
 - Se quitó la configuración "invalidMessageCss", que no era utilizada
 - Se agregó la posibilidad de configurar los caracteres permitidos
 que serán usados para permitir o no determinadas teclas (en el keyUp)
 La configuración es posible mediante la propiedad "allowedChars" o 
 bien con un atributo "allowedChars" en el tag del control.
 Esta propiedad es una cadena con todos los caracteres permitidos, NO una 
 expresión regular. Sin embargo se definieron algunos atajos que permitirán
 simplificar este listado, y que serán reemplazadas por su correspondiente 
 secuencia de caracteres:
    * a-z: permitirá los caracteres de la "a" a la "z" en minúscula
    * A-Z: permitirá los caracteres de la "a" a la "z" en mayúscula
    * 0-9: permitirá los números del 0 al 9.
 - Se agregó la posibilidad de configurar la expresión regular usada
 para validar el texto ingresado como un atributo del control, mediante el 
 atributo "validDataRegex"
  Ej:<input type="text" dataType="regex" id="txtMail" validDataRegex="^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$" allowedChars="a-zA-Z0-9_.+-@"/>
 - Se modificó el valor por defecto de la propiedad "specialChars" 
 para que sea null, en lugar de false.
 - se agregó un nuevo DataTypeValidator, el "genericDataTypeValidator"
 que será usado para todos los tipos de datos no contemplados, y para el regex.
 Este validator sólo permitirá el ingreso de los caracteres que hayan sido definidos
 en la propiedad (o atributo del control) "allowedChars" (incluyendo la coma, punto, etc 
 si se habilitaran los mismos); y validará que el texto ingresado cumpla con la expresión 
 regular definida en 
================================================================
                       FUNCIONALIDADES
================================================================
- Plugin de jquery que, según el tipo de dato definido:
    - No permite ingresar caracteres no válidos según el tipo
    - valide lo ingresado según el tipo de dato configurado al perder el foco
- Script que automáticamente lea un atributo e inicialice el plugin para los controles.
================================================================
                       POSIBLES MEJORAS
================================================================
- Hacer un DataTypeValidator("remove") para quitar la lógica de validación.
- Permitir desactivar el script de inicialización automático.
- una función que se pueda hacer validate(myString, tipoDato) 
    Ej: 
      $.validate("12345", numeric|currency|string|"abc...XYZ");
- valide la longitud del texto

================================================================
                    HISTORIAL DE VERSIONES
    [Registro histórico resumido de las distintas versiones]
================================================================
Código:       | DataTypeValidators - 2013-09-12 - v1.2.0.0
----------------------------------------------------------------
Autor:        | Sebastián Bustos Argañaraz
----------------------------------------------------------------
Cambios de la Versión:
 - Se renombró la propiedad "commaSeparators" a "commaSeparators" (2 emes)
 - Se corrigió un error encuando se definía un tipo de dato numérico (o currency)
  por el cual no estaba tomando la configuración del separador de comas especificada
  por el usuario.
 - Se corrigió una falla cuando la configuración de separadores de coma se especificaba
  como cadena (string) y no como array.
 - Se agregó la posibilidad de configurar la clase de estilo del mensaje de validación, y se 
  modificó el comportamiento por defecto, para que, si no se sobreescribe, se agergue la configuración
  por código.
----------------------------------------------------------------
Código:       | DataTypeValidators - 2013-07-18 - v1.1.0.0
----------------------------------------------------------------
Autor:        | Sebastián Bustos Argañaraz
----------------------------------------------------------------
Cambios de la Versión:
 - Se agregó la posibilidad de definir, en la página, una función
 que será utilizada por el componente para obtener la configuración
 de cada tipo de dato, cuando se asignan automáticamente los tipos
 (en la carga de la página)
- Se agregó el nuevo tipo de dato "integer" que permite el ingreso
de números pero sin decimales
- Se agregaron dos configuraciones adicionales:
	* allowDecimals: afecta a numerics y currency. Permite configurar
			si se admitirán decimales o no (si se deshabilita no permitirá
			ingresar ni "," ni "."
	* allowNegativesValues: afecta a numerics, intenger y currency
			permite habilitar y deshabilitar la carga de valores
			negativos.
----------------------------------------------------------------
Código:      1.0.0.0
Autor:       Sebastián Bustos Argañaraz
Cambios de la Versión:
  - Primera Versión del plugin
================================================================
*/