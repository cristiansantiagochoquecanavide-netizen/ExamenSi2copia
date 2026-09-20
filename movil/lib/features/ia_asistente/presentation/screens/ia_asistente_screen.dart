import 'package:flutter/material.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/app_notification.dart';
import '../../../../shared/services/cart_service.dart';
import '../../../catalogo/data/repositories/catalogo_repository.dart';
import '../../../catalogo/domain/models/catalogo_models.dart';
import '../../../catalogo/presentation/widgets/prenda_detail_modal.dart';
import '../../data/repositories/ia_asistente_repository.dart';
import '../../domain/models/ia_asistente_model.dart';

class IaAsistenteScreen extends StatefulWidget {
  const IaAsistenteScreen({super.key});

  @override
  State<IaAsistenteScreen> createState() => _IaAsistenteScreenState();
}

class _IaAsistenteScreenState extends State<IaAsistenteScreen> {
  final IaAsistenteRepository _iaRepository = IaAsistenteRepository();
  final CatalogoRepository _catalogoRepository = CatalogoRepository();
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<IaMensajeModel> _mensajes = [];
  List<PrendaModel> _catalogo = [];
  IaAsistenteStatusModel? _status;
  bool _isLoading = false;

  final List<String> _quickPrompts = [
    'Outfit para gala de noche',
    'Look formal para oficina',
    'Casual chic de verano',
    '¿Cómo combinar un vestido negro?',
    'Colección y precios vigentes',
  ];

  @override
  void initState() {
    super.initState();
    _initData();
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _initData() async {
    _mensajes = _iaRepository.getInitialMessages();
    try {
      final status = await _iaRepository.fetchStatus();
      if (mounted) setState(() => _status = status);
    } catch (_) {}

    try {
      final catalogo = await _catalogoRepository.getPrendas();
      if (mounted) setState(() => _catalogo = catalogo);
    } catch (_) {}
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _enviarMensaje(String texto) async {
    final cleanText = texto.trim();
    if (cleanText.isEmpty || _isLoading) return;

    _textController.clear();

    final userMsg = IaMensajeModel(
      id: 'usr-${DateTime.now().millisecondsSinceEpoch}',
      texto: cleanText,
      remitente: MensajeRemitente.usuario,
      fecha: DateTime.now(),
    );

    setState(() {
      _mensajes.add(userMsg);
      _isLoading = true;
    });
    _scrollToBottom();

    if (_catalogo.isEmpty) {
      try {
        _catalogo = await _catalogoRepository.getPrendas();
      } catch (_) {}
    }

    try {
      final respuesta = await _iaRepository.consultarStylist(
        prompt: cleanText,
        catalogo: _catalogo,
      );

      if (mounted) {
        setState(() {
          _mensajes.add(respuesta);
          _isLoading = false;
        });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _mensajes.add(
            IaMensajeModel(
              id: 'err-${DateTime.now().millisecondsSinceEpoch}',
              texto: 'Hubo una breve intermitencia al procesar tu consulta. Por favor, intentá nuevamente.',
              remitente: MensajeRemitente.asistente,
              fecha: DateTime.now(),
            ),
          );
          _isLoading = false;
        });
        _scrollToBottom();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AtelierScaffold(
      currentRoute: '/ia_asistente',
      child: Column(
        children: [
          // Header Concierge
          _buildHeader(),

          // Chat Message List
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: _mensajes.length + (_isLoading ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == _mensajes.length && _isLoading) {
                  return _buildTypingIndicator();
                }
                final msg = _mensajes[index];
                return _buildMessageBubble(msg);
              },
            ),
          ),

          // Quick Prompts Chips
          _buildQuickPromptsBar(),

          // Bottom Input Bar
          _buildInputBar(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: AppTheme.surfaceContainer,
        border: Border(bottom: BorderSide(color: Color(0xFFE5E7EB))),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: const BoxDecoration(
              color: Colors.black,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.auto_awesome, size: 16, color: AppTheme.goldAccent),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      'ATELIER STYLIST AI',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 4),
                          const Text(
                            'ONLINE',
                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.green),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  _status?.message ?? 'Asesoramiento de imagen y alta costura en tiempo real',
                  style: const TextStyle(fontSize: 11, color: AppTheme.mutedColor),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh, size: 20, color: AppTheme.mutedColor),
            tooltip: 'Reiniciar conversación',
            onPressed: () {
              setState(() {
                _mensajes = _iaRepository.getInitialMessages();
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(IaMensajeModel msg) {
    final isUser = msg.remitente == MensajeRemitente.usuario;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              margin: const EdgeInsets.only(right: 8, top: 2),
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.goldAccent),
                color: Colors.black,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.diamond_outlined, size: 14, color: AppTheme.goldAccent),
            ),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isUser ? Colors.black : Colors.white,
                    border: Border.all(
                      color: isUser ? Colors.black : const Color(0xFFE5E7EB),
                    ),
                    borderRadius: BorderRadius.zero,
                    boxShadow: isUser
                        ? null
                        : [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            )
                          ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (!isUser && msg.occasionTag != null) ...[
                        Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.goldAccent.withValues(alpha: 0.15),
                            border: Border.all(color: AppTheme.goldAccent.withValues(alpha: 0.4)),
                          ),
                          child: Text(
                            msg.occasionTag!.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.0,
                              color: Color(0xFF8C6B1B),
                            ),
                          ),
                        ),
                      ],
                      Text(
                        msg.texto,
                        style: TextStyle(
                          fontSize: 13,
                          height: 1.45,
                          color: isUser ? Colors.white : const Color(0xFF1F2937),
                        ),
                      ),
                    ],
                  ),
                ),
                // Tarjetas de prendas recomendadas dentro del chat
                if (msg.prendasRecomendadas != null && msg.prendasRecomendadas!.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 215,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: msg.prendasRecomendadas!.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                      itemBuilder: (context, idx) {
                        final prenda = msg.prendasRecomendadas![idx];
                        return _buildPrendaChatCard(prenda);
                      },
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (isUser) ...[
            Container(
              margin: const EdgeInsets.only(left: 8, top: 2),
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: Color(0xFF374151),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.person, size: 14, color: Colors.white),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPrendaChatCard(PrendaModel prenda) {
    return Container(
      width: 150,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Imagen de la prenda
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.network(
                  prenda.portadaUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: AppTheme.surfaceContainer,
                    child: const Center(child: Icon(Icons.checkroom, color: AppTheme.mutedColor, size: 28)),
                  ),
                ),
                Positioned(
                  top: 4,
                  left: 4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    color: Colors.black.withValues(alpha: 0.8),
                    child: Text(
                      prenda.categoria?.sector ?? 'UNISEX',
                      style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  prenda.nombre,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  'Bs ${prenda.precioBase.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.goldAccent),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => PrendaDetailModal.show(context, prenda),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.black),
                          ),
                          child: const Center(
                            child: Text(
                              'VER',
                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    InkWell(
                      onTap: () {
                        CartService.instance.addItem(prenda: prenda);
                        AppNotification.showSuccess('"${prenda.nombre}" añadida a la bolsa');
                      },
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        color: Colors.black,
                        child: const Icon(Icons.shopping_bag_outlined, size: 14, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              border: Border.all(color: AppTheme.goldAccent),
              color: Colors.black,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.diamond_outlined, size: 14, color: AppTheme.goldAccent),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Atelier Stylist pensando', style: TextStyle(fontSize: 12, color: AppTheme.mutedColor, fontStyle: FontStyle.italic)),
                SizedBox(width: 8),
                SizedBox(
                  width: 12,
                  height: 12,
                  child: CircularProgressIndicator(strokeWidth: 1.5, color: AppTheme.goldAccent),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickPromptsBar() {
    return Container(
      height: 42,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: _quickPrompts.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final prompt = _quickPrompts[index];
          return ActionChip(
            label: Text(
              prompt,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
            ),
            backgroundColor: AppTheme.surfaceContainer,
            side: const BorderSide(color: Color(0xFFE5E7EB)),
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            onPressed: () => _enviarMensaje(prompt),
          );
        },
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE5E7EB))),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _textController,
                textInputAction: TextInputAction.send,
                onSubmitted: _enviarMensaje,
                decoration: const InputDecoration(
                  hintText: 'Preguntale a tu estilista de moda...',
                  hintStyle: TextStyle(fontSize: 13, color: AppTheme.mutedColor),
                  contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.zero,
                    borderSide: BorderSide(color: Colors.black, width: 1.5),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            InkWell(
              onTap: () => _enviarMensaje(_textController.text),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: const BoxDecoration(
                  color: Colors.black,
                  shape: BoxShape.rectangle,
                ),
                child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

