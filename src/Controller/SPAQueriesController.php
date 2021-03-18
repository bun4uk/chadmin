<?php
declare(strict_types=1);

namespace App\Controller;

use  App\Service\ClickHouseClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Class SPAQueriesController
 * @package App\Controller
 */
class SPAQueriesController extends AbstractController
{
    /**
     * @return Response
     * @Route("/{wildcard}", name="vue_pages", requirements={"wildcard"=".*"})
     */
    public function index(): Response
    {
        return $this->render('rq.html.twig', [
            'controller_name' => 'SPAQueriesController',
        ]);
    }
}
