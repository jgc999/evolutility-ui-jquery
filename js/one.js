/*! ***************************************************************************
 *
 * evolutility :: one.js
 *
 * View one
 *
 * https://github.com/evoluteur/evolutility
 * Copyright (c) 2014, Olivier Giulieri
 *
 *************************************************************************** */

var Evol = Evol || {};

Evol.ViewOne = Backbone.View.extend({

    viewType:'one',
    cardinality: '1',

    events: {
        'click .evol-buttons>button': 'click_button',
        'click .evol-title-toggle': 'click_toggle',
        'click ul.evol-tabs>li>a': 'click_tab',
        'click label>.glyphicon-question-sign': 'click_help',
        'click .evol-field-label .glyphicon-wrench': 'click_customize',
        'click [data-id="bPlus"],[data-id="bMinus"]':'click_detailsAddDel'
        // extra evt for $(window) resize
    },

    options: {
        button_addAnother: false,
        style: 'panel-info',
        titleSelector: '#title'
    },

    initialize: function (opts) {
        var that=this;
        this.options=_.extend(this.options, opts);
        this.mode= opts.mode || this.options.mode || this.viewName;
        this._uTitle=(!_.isUndefined(this.options.titleSelector)) && this.options.titleSelector!=='';
        this.hashLov={};
        /*
        if(this.model){
            this.model.on('change', function(model){
                that.setModel(model);
            });
        }*/
        //TODO set responsive layout
    },

    render: function () {
        var h = [];
        this._render(h, this.mode);
        this.$el.html(h.join(''));
        this.custOn=false;
        this._postRender();
        return this;
    },

    _postRender: function (){
        // to overwrite...
    },

    getFields: function (){
        if(!this._fields){
            this._fields=Evol.Dico.getFields(this.options.uiModel, this.getFieldsCondition);
            this._fieldHash={};
            var that=this;
            _.each(this._fields,function(f){
                that._fieldHash[f.id]=f;
            });
        }
        return this._fields;
    },

    getSubCollecs: function (){
        if(!this._subCollecs){
            this._subCollecs=Evol.Dico.getSubCollecs(this.options.uiModel);
        }
        return this._subCollecs;
    },

    setModel: function(model) {
        this.model = model;
        return this
            .clearMessages()
            .setData(model);
    },

    getModel:function() {
        return this.model;
    },

    setUIModel: function(uimodel) {
        this.options.uiModel = uimodel;
        var d=this.getData();
        return this
            .render()
            .setData(d);
    },
    getUIModel: function() {
        return this.options.uiModel;
    },
/*
    modelUpdate: function (model) {
        var that=this;
        _.each(model.changed, function(value, name){
            that.setFieldValue(name, value);
        });
    },*/

    getTitle: function(){
        if(this.model){
            var lf=this.options.uiModel.leadfield;
            return _.isFunction(lf)?lf(this.model):this.model.get(lf);
        }else{
            return Evol.UI.capitalize(this.options.uiModel.entity);
        }
    },

    getData: function () {
        var that = this,
            fs=this.getFields(),
            vs = {},
            subCollecs=this.getSubCollecs();

        _.each(fs, function(f){
            vs[f.id]=that.getFieldValue(f);
        });
        if(subCollecs){
            // -- for each sub collection (panel-list)
            _.each(subCollecs, function (sc) {
                var rows=that.$('[data-pid="'+sc.id+'"] tbody tr').not('[data-id="nodata"]').toArray(),
                    v,
                    cells,
                    vs2=[];
                // -- for each row
                _.each(rows,function(row){
                    v={};
                    cells=$(row).children();
                    // -- for each field
                    _.each(sc.elements,function(f, idx){
                        v[f.id]=Evol.Dico.getFieldTypedValue(f, cells.eq(idx).find('input,select,textarea').eq(0));
                    });
                    vs2.push(v);
                });
                vs[sc.attr]=vs2;
            });
        }
        return vs;
    },

    setData: function (model) {
        if((!_.isUndefined(model)) && model!==null){
            var fs = this.getFields(),
                that=this,
                fTypes = Evol.Dico.fieldTypes,
                $f, fv,
                prefix='#'+ that.prefix + '-',
                subCollecs=this.getSubCollecs();
            _.each(fs, function (f) {
                $f=that.$(prefix + f.id);
                fv=model.get(f.id);
                if(model){
                    if(f.readonly){
                        $f.text(fv || '');
                    }else{
                        switch(f.type) {
                            case fTypes.lov:
                                $f.children().removeAttr('selected')
                                    .filter('[value='+fv+']')
                                    .attr('selected', true);
                                break;
                            case fTypes.bool:
                                $f.prop('checked', fv);
                                break;
                            case fTypes.pix:
                                var newPix=(fv)?('<img src="'+fv+'" class="img-thumbnail">'):('<p class="">'+Evol.i18n.nopix+'</p>');
                                $f.val(fv)
                                    .prev().remove();
                                $f.before(newPix);
                                break;
                            default:
                                $f.val(fv);
                        }
                    }
                }
            });
            if(subCollecs){
                _.each(subCollecs, function (sc) {
                    var h=[];
                    that._renderPanelListBody(h, sc, fv, 'edit');
                    that.$('[data-pid="'+sc.id+'"] tbody')
                        .html(h.join(''));
                });
            }
        }
        return this.setTitle();
    },

    clear: function () {
        var fs = this.getFields(),
            that=this,
            $f,
            prefix='#'+ that.prefix + '-',
            subCollecs=this.getSubCollecs();

        this.clearMessages();
        _.each(fs, function (f) {
            $f=that.$(prefix + f.id);
            switch(f.type) {
                case 'boolean':
                    $f.prop('checked', f.defaultvalue || '');
                    break;
                default:
                    $f.val(f.defaultvalue || '');
            }
        });
        if(subCollecs){
            _.each(subCollecs, function (sc) {
                that.$('[data-pid="'+sc.id+'"] tbody')
                    .html(that._TRnodata(sc.elements.length, 'edit'));
            });
        }
        return this;
    },

    isDirty: function(){
        // TODO
         /*
        var data=this.getData(),
            model=this.model;

        for(var prop in data){
            if(data[prop] !== model.get(prop)){
                alert('data[prop]='+data[prop]+' - model.get(prop)='+model.get(prop)); //TODO remove this alert
                return true;
            }
        }*/
        return false;
    },

    setFieldValue: function (fid, value){
        this.$('#'+this.fieldViewId(fid))
            .val(value);
        return this;
    },

    getFieldValue: function (f){
        var $f=this.$('#'+this.fieldViewId(f.id));
        return Evol.Dico.getFieldTypedValue(f, $f);
    },

    showTab: function (tabid) {
        var tab = this.$(tabid);
        if (tab.length > 0) {
            tab.siblings('.tab-pane').hide();
            tab.show();
        }
        tab = this.$('.evol-tabs > li a[href="' + tabid + '"]').parent();
        if (tab.length > 0) {
            tab.siblings('li').removeClass('active');
            tab.addClass('active');
        }
        this.$el.trigger('tab.show');
        return this;
    },

    _renderButtons: function (h, mode) {
        h.push(Evol.UI.html.clearer,
            '<div class="evol-buttons">',
            Evol.UI.input.button('cancel', Evol.i18n.Cancel, 'btn-default'),
            Evol.UI.input.button('save', Evol.i18n.Save, 'btn-primary'));
        if (this.model && this.model.isNew() && this.options.button_addAnother && mode!=='json') {
            h.push(Evol.UI.input.button('save-add', Evol.i18n.SaveAdd, 'btn-default'));
        }
        h.push('</div>');
    },

    _render: function (h, mode) {
        // EDIT and VIEW forms
        var that=this,
            iTab = -1,
            iPanel = -1,
            opts = this.options,
            elems = opts.uiModel.elements,
            iMax = elems.length;

        h.push('<div class="evo-one-',mode,'">');
        _.each(elems, function(p,idx){
            switch (p.type) {
                case 'tab':
                    if (iPanel > 0) {
                        h.push('</div>');
                        iPanel = -1;
                    }
                    if (iTab < 0) {
                        h.push(Evol.UI.html.clearer);
                        that.renderTabs(h, elems);
                        h.push('<div class="tab-content">');
                    }
                    iTab++;
                    h.push('<div id="evol-tab-', idx, '" class="tab-pane', (idx === 1 ? ' active">' : '">'));
                    that.renderTab(h, p, mode);
                    if (iTab == iMax - 1) {
                        h.push('</div>');
                    }
                    break;
                case 'panel':
                    if (iPanel < 0) {
                        h.push('<div class="evol-pnls">');
                        iPanel = 1;
                    }
                    that.renderPanel(h, p, 'p-' + p.id, mode);
                    break;
                case 'panel-list':
                    if (iPanel < 0) {
                        h.push('<div class="evol-pnls">');
                        iPanel = 1;
                    }
                    that.renderPanelList(h, p, mode);
                    break;
            }
        });
        if (iPanel > 0) {
            h.push('</div>');
        }
        h.push('</div>');
        this._renderButtons(h, mode);
    },

    renderTabs: function (h, ts) {
        var isFirst = true;
        h.push('<ul class="nav nav-tabs evol-tabs">');
        _.each(ts, function (t, idx) {
            if (t.type == 'tab') {
                if (isFirst) {
                    h.push('<li class="active">');
                    isFirst = false;
                } else {
                    h.push('<li>');
                }
                h.push('<a href="#evol-tab-', idx, '">', t.label, '</a></li>');
            }
        });
        h.push('</ul>');
    },

    renderTab: function (h, t, mode) {
        var that = this;
        h.push('<div class="evol-pnls">');
        _.each(t.elements, function (uip, idx) {
            if (uip.type === 'panel-list') {
                that.renderPanelList(h, uip, mode);
            } else {
                that.renderPanel(h, uip, uip.id || 'pl-'+idx, mode);
            }
        });
        h.push(Evol.UI.html.clearer, '</div></div>'); // TODO 2 div?
    },

    renderPanel: function (h, p, pid, mode, visible) {
        var that = this;
        if(mode==='wiz'){
            var hidden= _.isUndefined(visible)?false:!visible;
            h.push('<div data-p-width="100" class="evol-pnl evo-p-wiz" style="width:100%;',hidden?'display:none;':'','">');
        }else{
            h.push('<div data-p-width="', p.width, '" class="evol-pnl');
            if(mode==='mini'){
                h.push(' w-100 ', (p.class || ''), '">');
            }else{
                h.push(' pull-left" style="width:', p.width, '%">');
            }
        }
        h.push('<div class="panel ', this.options.style, '">',
            Evol.UI.HTMLPanelLabel(p.label, pid, 'PanelLabel'),
            '<fieldset data-pid="', pid, '">');
        if(mode==='mini'){
            _.each(p.elements, function (elem) {
                h.push('<div class="pull-left evol-fld w-100">');
                that.renderField(h, elem, mode);
                h.push("</div>");
            });
        }else{
            _.each(p.elements, function (elem) {
                if(elem.type=='panel-list'){
                    that.renderPanelList(h, elem, mode);
                }else{
                    h.push('<div style="width:', parseInt(elem.width, 10), '%" class="pull-left evol-fld">');
                    that.renderField(h, elem, mode);
                    h.push("</div>");
                }
            });
        }
        h.push('</fieldset></div></div>');
    },

    renderPanelList: function (h, p, mode) {
        h.push('<div style="width:', p.width, '%" class="evol-pnl pull-left" data-pid="', p.id,'">',
            '<div class="panel ', this.options.style, '">',
            Evol.UI.HTMLPanelLabel(p.label, p.id, 'PanelLabel'),
            '<table class="table" data-mid="', p.attr,'"><thead><tr>'); // table-striped
        _.each(p.elements, function (elem) {
            h.push('<th>', elem.label, '</th>');
        });
        if(mode==='edit'){
            h.push('<th></th>');
        }
        h.push('</tr></thead><tbody>');
        this._renderPanelListBody(h, p, null, mode);
        h.push('</tbody></table></div></div>');
    },

    _renderPanelListBody: function (h, uiPnl, fv, mode){
        var that=this,
            fs = uiPnl.elements;

        if(this.model){
            var vs = this.model.get(uiPnl.attr);
            if(vs && vs.length>0){
                var TDbPM='<td class="evo-td-plusminus">'+Evol.UI.input.buttonsPlusMinus()+'</td>';
                _.each(vs, function(row, idx){
                    h.push('<tr data-idx="',idx,'">');
                    if(mode==='edit'){
                        that._TDsFieldsEdit(h, uiPnl.elements, row);
                        h.push(TDbPM);
                    }else{
                        _.each(fs, function (f) {
                            h.push('<td>');
                            if(row[f.id]){
                                h.push(_.escape(Evol.Dico.HTMLField4Many(f, row[f.id], this.hashLov)));
                            }else{
                                h.push(Evol.Dico.HTMLField4Many(f, '', this.hashLov));
                            }
                            h.push('</td>');
                        });
                    }
                    h.push('</tr>');
                });
                return;
            }
        }
        h.push(this._TRnodata(fs.length, mode));
    },

    _TRnodata: function(colspan, mode){
        return ['<tr data-id="nodata"><td colspan="',mode==='edit'?(colspan+1):colspan,'" class="evol-pl-nodata">',
            Evol.i18n.nodata,
            mode==='edit'?'<div data-id="bPlus" class="glyphicon glyphicon-plus-sign"></div>':'',
            '</td></tr>'].join('');
    },

    _TDsFieldsEdit: function(h, fs, m){
        var fv;
        _.each(fs, function (f) {
            fv=m[f.id];
            if(_.isUndefined(fv)){
                fv='';
            }
            h.push('<td>', Evol.Dico.HTMLField4One(f, f.id, fv, 'edit-details', true), '</td>');
        });
    },

    renderField: function (h, f, mode) {
        var fid = this.fieldViewId(f.id),
            fv='';
        if(this.model && this.model.has(f.id)){
            fv = (mode !== 'new') ? this.model.get(f.id) : f.defaultvalue || '';
        }
        h.push(Evol.Dico.HTMLField4One(f, fid, fv, mode));
        return this;
    },

    renderFieldLabel: function (h, fld, mode) {
        h.push(Evol.Dico.HTMLFieldLabel(fld, mode));
    },

    setTitle: function (title){
        if(this._uTitle){
            var opts=this.options,
                selector=opts.titleSelector;
            if(selector && selector!==''){
                var t,lf=opts.uiModel.leadfield;
                if(title){
                    t=title;
                }else if((!_.isUndefined(lf)) && lf!==''){
                    t=this.getTitle();
                }else{
                    t=Evol.UI.capitalize(opts.uiModel.entities);
                }
                $(selector).text(t);
                this._uTitle=true;
                return this;
            }
            this._uTitle=false;
        }
        return this;
    },

    validate: function (sfs) {
        var fs = sfs?sfs:this.getFields();
        this.clearMessages();
        if (_.isArray(fs)) {
            return Evol.UI.Validation.checkFields(this.$el, fs, this.prefix);
        }
        if(this._subCollecs){
            //TODO

        }
        this.$el.trigger('action', 'validate');
        return false;
    },

    clearErrors: function () {
        this.$('.control-group.error').removeClass("control-group error");
        //this.$('.evol-warn-error').remove();
        this.$('.has-error').removeClass('has-error');
        this.$('.text-danger').remove();
        return this;
    },

    fieldViewId: function(fid){
        return this.prefix + '-' + fid;
    },

    customize: function(){
        var labelSelector = '.evol-field-label>label',
            panelSelector ='.evol-pnl .panel-title';
        if(this.custOn){
            this.$(labelSelector + '>i, '+ panelSelector + '>i').remove();
            this.custOn=false;
        }else{
            _.each(this.$(labelSelector),function(elem){
                var $el=$(elem),
                    id=$el.attr('for');
                $el.append(Evol.UI.iconCustomize(id,'field'));
            });
            this.$(panelSelector).append(Evol.UI.iconCustomize('id','panel'));
            this.custOn=true;
        }
        return this;
    },

    showHelp:function(id, type, $el){
        var fs=Evol.Dico.getFields(this.options.uiModel),
            fld=_.findWhere(fs,{id:id});

        if(fld||fld.help){
            var $f=$el.closest('.evol-fld'),
                $fh=$f.find('.help-block');
            if($fh.length>0){
                $fh.slideUp(200, function(){
                    $fh.remove();
                });
            }else{
                var $elDes=$('<span class="help-block">' + _.escape(fld.help) + '</span>').hide();
                $f.append($elDes);
                $elDes.slideDown(200);
            }
        }
        return this;
    },

    /*
     _setResponsive: function (evt) {
         if(mode==='new' || mode==='edit'){
            this.windowSize='big';
            $(window).resize(function() {
                var pnls = that.$('.evol-pnl');
                 if($(window).width()>480){
                    if(that.windowSize!=='big'){
                        _.each(pnls, function (pnl){
                            var $p=$(pnl),
                            ps=$p.data('p-width');
                            $p.attr('style', 'width:'+ps+'%;');
                        });
                        that.windowSize='big';
                    }
                 }else{
                     if(that.windowSize!=='small'){
                         pnls.attr('style', 'width:100%');
                         that.windowSize='small';
                     }
                }
             });
         }
     }*/

    clearMessages: function(){
        this.$el.trigger('message', null);
        return this.clearErrors();
    },

    sendMessage: function(title,content,style){
        return this.$el.trigger('message',{
            title:title,
            content:content,
            style:style
        });
    },

    click_button: function (evt) {
        var bId = $(evt.currentTarget).data('id');
        evt.stopImmediatePropagation();
        this.$el.trigger('action', bId);
    },

    click_toggle: function (evt) {
        var $this = $(evt.currentTarget),
            content = $this.closest('.panel-heading').next(),
            state = content.data('expState'),
            cssUp = 'glyphicon-chevron-up',
            cssDown = 'glyphicon-chevron-down';
        evt.preventDefault();
        evt.stopImmediatePropagation();
        if(evt.shiftKey){
            var css = (state==='down')?cssDown:cssUp;
            this.$('.evol-title-toggle.'+css)
                .trigger('click');
        }else{
            if (state === 'down') {
                $this.closest('.panel').css('height','');
                content.slideDown(300)
                    .data('expState', 'up');
                $this.addClass(cssUp)
                    .removeClass(cssDown);
            } else {
                content.slideUp(300, function() {
                    $this.closest('.panel').css('height','40px');
                }).data('expState', 'down');
                $this.removeClass(cssUp)
                    .addClass(cssDown);
            }
        }
        this.$el.trigger('panel.toggle');
    },

    click_tab: function (evt) {
        var href = evt.currentTarget.href,
            id = href.substring(href.indexOf('#'));
        evt.stopImmediatePropagation();
        evt.preventDefault();
        if(evt.shiftKey){
            this.$('.tab-content > div').show();
        }else{
            this.showTab(id);
        }
    },

    click_help: function (evt) {
        var $e=$(evt.currentTarget),
            id=$e.closest('label').attr('for'),
            eType=$e.data('type');

        evt.stopImmediatePropagation();
        this.showHelp(id, eType, $e);
        /*if(evt.shiftKey){
            id=0;
            var flds=$e.closest('.evo-one-edit').find('label > .glyphicon-question-sign');
            _.each(flds, function(f){
                // that.showHelp(id, eType, $e);
            });
        }else{
            this.showHelp(id, eType, $e);
        }*/
        this.$el.trigger(eType+'.help', {id: id});
    },

    click_customize: function (evt) {
        var $e=$(evt.currentTarget),
            id=$e.data('id'),
            eType=$e.data('type');
        evt.stopImmediatePropagation();
        Evol.Dico.showDesigner(id, eType, $e, this);
        this.$el.trigger(eType+'.customize', {id: id, type:eType});
    },

    click_detailsAddDel: function(evt){
        var $targ=$(evt.currentTarget),
            bId=$targ.data('id'),
            tr=$targ.closest('tr');

        evt.stopImmediatePropagation();
        if(bId==='bPlus'){
            var h=[],
                subCollecs=this.getSubCollecs(),
                mid=tr.closest('table').data('mid'),
                elems=(subCollecs[mid])?subCollecs[mid].elements:null;
            h.push('<tr>');
            this._TDsFieldsEdit(h, elems, {});
            h.push('<td class="evo-td-plusminus">',
                Evol.UI.input.buttonsPlusMinus(),
                '</td></tr>');
            $(h.join('')).insertAfter(tr);
            if(tr.data('id')==='nodata'){
                tr.remove();
            }
        }else if(bId==='bMinus'){
            if(tr.siblings().length===0){
                $(this._TRnodata(tr.children().length, 'edit'))
                    .insertAfter(tr);
            }
            tr.remove();
        }
    }

});

