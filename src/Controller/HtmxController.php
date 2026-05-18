<?php
declare(strict_types=1);

namespace App\Controller;

use App\Service\ClickHouseClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Class HtmxController
 * @package App\Controller
 */
class HtmxController extends AbstractController
{
    private string $projectDir;

    public function __construct(string $projectDir)
    {
        $this->projectDir = $projectDir;
    }

    #[Route('/', name: 'htmx_app')]
    public function index(): Response
    {
        // Рендеримо головну сторінку через Twig шаблон
        return $this->render('index.html.twig');
    }
} 